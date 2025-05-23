from typing import Optional, List
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
from aws import boto
from langchain_community.document_loaders import PyPDFLoader, S3DirectoryLoader
from langchain.chains.combine_documents.stuff import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_openai import OpenAIEmbeddings
from prompts import *
from langchain.output_parsers import PydanticOutputParser
import simplejson
from boto3.dynamodb.conditions import Key
import time
from langchain_core.output_parsers import BaseOutputParser
from typing import Any, Optional
from langchain_core.runnables import RunnableConfig
from qdrant_client import QdrantClient
from dotenv import load_dotenv
import os
from langchain_qdrant import QdrantVectorStore
from langchain_core.output_parsers import BaseOutputParser
from typing import Any
import json
from langchain_community.document_loaders import S3FileLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
qdrant_client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_API_KEY"))
qdrant_vs = QdrantVectorStore(
    client=qdrant_client,
    collection_name="axon",
    embedding=embeddings
)
qdrant_retriever = qdrant_vs.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 10}
)

llm = ChatOpenAI(model_name="gpt-4o")

class NoOpOutputParser(BaseOutputParser[Any]):
    def parse(self, text: Any) -> Any:
        # Just return the input as-is, no parsing
        return text

    async def ainvoke(
        self,
        input: Any,
        config: Optional[RunnableConfig] = None,
        **kwargs,
    ) -> Any:
        # Return input directly, no wrapping or parsing
        return input

tag_file_chain = create_stuff_documents_chain(
    llm=llm,
    prompt=tag_file_prompt
)

async def process_syllabus(user_id, course_id, filename):
    
    s3_key = f'upload/{user_id}/{course_id}/{filename}'

    loader = S3FileLoader(
        bucket="axon-main",
        key=s3_key
    )
    docs = await loader.aload()

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = splitter.split_documents(docs) # TODO async

    for doc in splits:
        doc.metadata["topic"] = ["Syllabus"]
        doc.metadata["user_id"] = user_id
        doc.metadata["course_id"] = int(course_id)
    
    await qdrant_vs.aadd_documents(splits)

async def ingest_with_nim_via_langchain(user_id: str, course_id: str, filename: str):
    s3_uri = f"s3://axon-main/upload/{user_id}/{course_id}/{filename}"
    docs: list[Document] = []

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        # 1) Parse PDF → text_blocks + page_images
        async with session.post(PARSE_URL, json={"uri": s3_uri}) as resp:
            resp.raise_for_status()
            parsed = await resp.json()

        # convert text blocks into Documents
        for blk in parsed["text_blocks"]:
            docs.append(Document(
                page_content=blk["text"],
                metadata={
                    "user_id": user_id,
                    "course_id": course_id,
                    "page": blk["page"],
                    "type": "text_block",
                }
            ))

        # 2) Detect regions on each page image
        for img in parsed.get("page_images", []):
            async with session.post(PAGEEL_URL, json={"image_uri": img["uri"]}) as r2:
                r2.raise_for_status()
                regions = (await r2.json())["regions"]

            # 3) Extract graphic/table text as Documents
            for reg in regions:
                if reg["type"] == "graphic":
                    url = GRAPHIC_URL; field = "texts"
                elif reg["type"] == "table":
                    url = TABLE_URL; field = "data"
                else:
                    continue

                async with session.post(url, json={
                    "image_uri": img["uri"],
                    "bbox": reg["bbox"]
                }) as r3:
                    r3.raise_for_status()
                    out = await r3.json()

                if reg["type"] == "graphic":
                    for t in out.get("texts", []):
                        docs.append(Document(
                            page_content=t["text"],
                            metadata={
                                "user_id": user_id,
                                "course_id": course_id,
                                "page": img["page"],
                                "type": "graphic",
                                **t
                            }
                        ))
                else:  # table rows
                    headers = out.get("headers", [])
                    for row in out.get("data", []):
                        docs.append(Document(
                            page_content="\t".join(row),
                            metadata={
                                "user_id": user_id,
                                "course_id": course_id,
                                "page": img["page"],
                                "type": "table",
                                "headers": headers
                            }
                        ))
    
    print(docs)

    # 4) Bulk‐add to Qdrant via LangChain
    #    this will call your NIM embed endpoint under the hood
    await qdrant_vs.aadd_documents(docs)

async def process_new_file(user_id, course_id, filename):

    s3_key = f'upload/{user_id}/{course_id}/{filename}'

    loader = S3FileLoader(
        bucket="axon-main",
        key=s3_key
    )
    docs = await loader.aload()

    composite_id = str(user_id) + str(course_id)

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        #dynamo_response = await table.get_item(Key=user_id)

        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        if dynamo_items:
            lp_curr = json.loads(dynamo_items[0]["data"])
            print(lp_curr)
            lp_topics = lp_curr["topics"]
    
    if not lp_topics:
        return

async def answer_message(user_id, course_id, user_query):
    composite_id = str(request_data["user_id"])

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('chat-history')

        print(f"Querying: {composite_id}")
        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,  # newest first
            Limit=30,               # get up to the last 100 items
        )
        dynamo_items = dynamo_response.get("Items", [])
        dynamo_items = list(reversed(dynamo_items))


        print(f"GOT LAST {len(dynamo_items)} ITEMS FOR {composite_id}:::")
        print(dynamo_items)

        if dynamo_items:
            hist = [
                json.loads(item["data"])
                for item in dynamo_items
            ]
            return {
                "status": "success",
                "history": hist
            }
        else:
            return {
                "status": "failure",
                "history": None
            }


class FormulaSheet(BaseModel):
    text: str = Field(description="The contents of the formula sheet")

formula_stuff_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(FormulaSheet, method="function_calling"),
    prompt=formula_prompt,
    output_parser=NoOpOutputParser()
)
formula_chain = create_retrieval_chain(
    retriever=qdrant_retriever,
    combine_docs_chain=formula_stuff_chain
)

async def generate_formula_sheet(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        #dynamo_response = await table.get_item(Key=user_id)

        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        topics = []
        if dynamo_items:
            lp_curr = json.loads(dynamo_items[0]["data"])
            print(lp_curr)
            lp_topics = lp_curr["topics"]
            
            for topic_name in topic_names:
                for item in lp_topics:
                    if item.get("topic_name") == topic_name:
                        topics.append(item)
        
        if not topics:
            topics = topic_names

        llm_response = (await formula_chain.ainvoke({"topics": topics, "input": user_query}))["answer"]

        return llm_response

class StudyGuide(BaseModel):
    text: str = Field(description="The contents of the study guide")

study_stuff_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(StudyGuide, method="function_calling"),
    prompt=study_prompt,
    output_parser=NoOpOutputParser()
)
study_chain = create_retrieval_chain(
    retriever=qdrant_retriever,
    combine_docs_chain=study_stuff_chain
)

async def generate_study_guide(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        #dynamo_response = await table.get_item(Key=user_id)

        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        topics = []
        if dynamo_items:
            lp_curr = json.loads(dynamo_items[0]["data"])
            print(lp_curr)
            lp_topics = lp_curr["topics"]
            
            for topic_name in topic_names:
                for item in lp_topics:
                    if item.get("topic_name") == topic_name:
                        topics.append(item)
        
        if not topics:
            topics = topic_names

        llm_response = (await study_chain.ainvoke({"topics": topics, "input": user_query}))["answer"]

        return llm_response

class QuizQuestion(BaseModel):
    question: str = Field(description="The question being asked")
    correctOption: str = Field(description="The correct answer")
    wrongOptionOne: str = Field(description="First wrong option")
    wrongSuggestionOne: str = Field(description="Suggestion or clarification on why the first wrong option is incorrect")
    wrongOptionTwo: str = Field(description="Second wrong option")
    wrongSuggestionTwo: str = Field(description="Suggestion or clarification on why the second wrong option is incorrect")
    wrongOptionThree: str = Field(description="Third wrong option")
    wrongSuggestionThree: str = Field(description="Suggestion or clarification on why the third wrong option is incorrect")

class QuizSet(BaseModel):
    questions: List[QuizQuestion] = Field(description="The questions in this quiz")

quiz_stuff_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(QuizSet, method="function_calling"),
    prompt=quiz_prompt,
    output_parser=NoOpOutputParser()
)
quiz_chain = create_retrieval_chain(
    retriever=qdrant_retriever,
    combine_docs_chain=quiz_stuff_chain
)

async def generate_quiz(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        #dynamo_response = await table.get_item(Key=user_id)

        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        topics = []
        if dynamo_items:
            lp_curr = json.loads(dynamo_items[0]["data"])
            print(lp_curr)
            lp_topics = lp_curr["topics"]
            
            for topic_name in topic_names:
                for item in lp_topics:
                    if item.get("topic_name") == topic_name:
                        topics.append(item)
        
        if not topics:
            topics = topic_names

        llm_response = (await quiz_chain.ainvoke({"topics": topics, "input": user_query}))["answer"]

        return llm_response

class CourseTopic(BaseModel):
    topic_name: str = Field(description="Name of the topic")
    topic_content: str = Field(description="Core content in this topic")
    #topic_mastery: str = Field(description="A string describing what must be mastered in this topic")

class CourseTest(BaseModel):
    test_date: Optional[str] = Field(default=None, description="Date of the test")
    covered_topic_names: List[str] = Field(description="A list of the topic names that will be covered on this test")

class LearningPlan(BaseModel):
    course_name: str = Field(description="Name of the user's course")
    course_description: str = Field(description="Description of the user's course")
    topics: List[CourseTopic] = Field(description="The topics of this course")
    tests: List[CourseTest] = Field(description="Main tests of this course")
    additional_info: str = Field(description="Any additional info (concise)")

lp_new_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(LearningPlan, method="function_calling"),
    prompt=lp_new_prompt,
    output_parser=NoOpOutputParser()
)

lp_existing_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(LearningPlan, method="function_calling"),
    prompt=lp_existing_prompt,
    output_parser=NoOpOutputParser()
)

async def generate_learning_plan(user_id, course_id):

    composite_id = str(user_id) + str(course_id)

    try:

        lp_curr = None

        async with boto.resource("dynamodb") as dynamodb:
            table = await dynamodb.Table('learning-plans')
            #dynamo_response = await table.get_item(Key=user_id)

            dynamo_response = await table.query(
                KeyConditionExpression=Key("user_id").eq(composite_id),
                ScanIndexForward=False,
                Limit=1,
            )
            dynamo_items = dynamo_response.get("Items", [])
            
            if dynamo_items:
                lp_curr = json.loads(dynamo_items[0]["data"])
                print("Detected existing learning plan")
            else:
                print("Making new learning plan")

        print(f"Problematic user id, course id: {user_id} , {course_id}")

        loader = S3DirectoryLoader(
            bucket="axon-main",
            prefix=f"upload/{user_id}/{course_id}"
        )
        docs = await loader.aload()

        print(docs)

        if lp_curr:
            llm_response = await lp_existing_chain.ainvoke({"context": docs, "learning_plan": lp_curr})
        else:
            llm_response = await lp_new_chain.ainvoke({"context": docs})
        
        async with boto.resource("dynamodb") as dynamodb:
            table = await dynamodb.Table('learning-plans')
            
            dynamo_item = {
                "user_id": composite_id,
                "timestamp": int(time.time()),
                "data": llm_response.json()
            }
            
            await table.put_item(Item=dynamo_item)
        
        print(f"Put new learning plan with prefix: {composite_id}")

    except Exception as e:
        print(f"Error generating learning plan: {str(e)}")
        raise

class Flashcard(BaseModel):
    question: str = Field(description="The question side of the flashcard")
    answer: str = Field(description="The answer side of the flashcard")

class FlashcardsSet(BaseModel):
    flashcards: List[Flashcard] = Field(description="List of flashcards")

flash_stuff_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(FlashcardsSet, method="function_calling"),
    prompt=flash_prompt,
    output_parser=NoOpOutputParser()
)
flash_chain = create_retrieval_chain(
    retriever=qdrant_retriever,
    combine_docs_chain=flash_stuff_chain
)

async def generate_flashcards(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        #dynamo_response = await table.get_item(Key=user_id)

        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        topics = []
        if dynamo_items:
            lp_curr = json.loads(dynamo_items[0]["data"])
            print(lp_curr)
            lp_topics = lp_curr["topics"]
            
            for topic_name in topic_names:
                for item in lp_topics:
                    if item.get("topic_name") == topic_name:
                        topics.append(item)
        
        if not topics:
            topics = topic_names

        llm_response = (await flash_chain.ainvoke({"topics": topics, "input": user_query}))["answer"]

        return llm_response


#def generate_topic_tags():
    

#def regenerate_topic_tags():