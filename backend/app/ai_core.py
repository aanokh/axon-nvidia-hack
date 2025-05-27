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
#from qdrant_client import QdrantClient
from dotenv import load_dotenv
import os
#from langchain_qdrant import QdrantVectorStore
from langchain_core.output_parsers import BaseOutputParser
from typing import Any
import json
from langchain_community.document_loaders import S3FileLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from nim_retriever import *
import aiq.plugins.langchain.register
from aiq.profiler.decorators.framework_wrapper import set_framework_profiler_handler
from aiq.builder.workflow_builder import WorkflowBuilder
from aiq.llm.openai_llm import OpenAIModelConfig
from aiq.llm.openai_llm import openai_llm as register_openai_llm
from aiq.embedder.openai_embedder import OpenAIEmbedderModelConfig
from aiq.embedder.openai_embedder import openai_llm as register_openai_embedder
from aiq.runtime.loader import load_config

llm = ChatOpenAI(model_name="gpt-4o")

class NoOpOutputParser(BaseOutputParser[Any]):
    def parse(self, text: Any) -> Any:
        return text

    async def ainvoke(
        self,
        input: Any,
        config: Optional[RunnableConfig] = None,
        **kwargs,
    ) -> Any:
        return input

async def init_aiq_toolkit() -> WorkflowBuilder:
    builder = WorkflowBuilder()

    async with register_openai_embedder(
            OpenAIEmbedderModelConfig(
                api_key   = os.getenv("OPENAI_API_KEY"),
                model_name="text-embedding-3-large",
            ),
            builder,
        ), register_openai_llm(
            OpenAIModelConfig(
                api_key   = os.getenv("OPENAI_API_KEY"),
                model_name="gpt-4o",
            ),
            builder,
        ):
        return builder

def convert_composite_id(composite_id):
    return '_' + composite_id.replace('-', '_')

async def get_nim_retriever(composite_id):
    nim_vs = nimRAGVectorStore(
        retriever_url=os.getenv("NIM_RETRIEVER_URL"),
        ingestion_url=os.getenv("NIM_INGESTION_URL"),
        api_key=os.getenv("NIM_API_KEY"),
        collection_name=convert_composite_id(composite_id)
    )
    #nim_retriever = aiq_client.instrument(nim_vs.as_retriever())
    nim_retriever = nim_vs.as_retriever()
    return nim_retriever

async def process_syllabus(user_id, course_id, filename):
    
    s3_key = f'upload/{user_id}/{course_id}/{filename}'
    composite_id = str(user_id) + str(course_id)

    loader = S3FileLoader(
        bucket="axon-main",
        key=s3_key
    )
    docs = await loader.aload()

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = splitter.split_documents(docs) # TODO async

    #for doc in splits:
    #    doc.metadata["topic"] = ["Syllabus"]
    #    doc.metadata["user_id"] = user_id
    #    doc.metadata["course_id"] = int(course_id)
    
    nim_vs = nimRAGVectorStore(
        retriever_url=os.getenv("NIM_RETRIEVER_URL"),
        ingestion_url=os.getenv("NIM_INGESTION_URL"),
        api_key=os.getenv("NIM_API_KEY"),
        collection_name=convert_composite_id(composite_id)
    )

    await nim_vs.aadd_documents(splits)

async def process_new_file(user_id, course_id, filename):

    s3_key = f'upload/{user_id}/{course_id}/{filename}'
    composite_id = str(user_id) + str(course_id)

    loader = S3FileLoader(
        bucket="axon-main",
        key=s3_key
    )
    docs = await loader.aload()

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = splitter.split_documents(docs) # TODO async

    #for doc in splits:
    #    doc.metadata["topic"] = ["Syllabus"]
    #    doc.metadata["user_id"] = user_id
    #    doc.metadata["course_id"] = int(course_id)
    
    nim_vs = nimRAGVectorStore(
        retriever_url=os.getenv("NIM_RETRIEVER_URL"),
        ingestion_url=os.getenv("NIM_INGESTION_URL"),
        api_key=os.getenv("NIM_API_KEY"),
        collection_name=convert_composite_id(composite_id)
    )

    await nim_vs.aadd_documents(splits)

qa_stuff_chain = create_stuff_documents_chain(
    llm=llm,
    prompt=qa_prompt,
    output_parser=NoOpOutputParser()
)

async def answer_message(user_id, course_id, user_query):
    composite_id = str(user_id) + str(course_id)

    nim_retriever = await get_nim_retriever(composite_id)

    qa_chain = create_retrieval_chain(
        retriever=nim_retriever,
        combine_docs_chain=qa_stuff_chain
    )

    '''
    personalization = {}
    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('personalization')
        #dynamo_response = await table.get_item(Key=user_id)

        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        if dynamo_items:
            personalization = json.loads(dynamo_items[0]["data"])
            print(personalization)
    '''

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table("chat-history")

        # 1) Load up to the last 30 messages, newest first
        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=30,
        )
        items = dynamo_response.get("Items", [])
        # reverse so that history is oldest→newest
        items = list(reversed(items))

        # 2) Deserialize message history into a list of {role, content} dicts
        if items:
            history = [json.loads(item["data"]) for item in items]
        else:
            history = []  # no history yet

        # 3) Invoke your QA chain
        result = await qa_chain.ainvoke({
            "history": history,
            "input": user_query
        })
        assistant_response = result["answer"].content

        # 4) Persist the new user message + assistant response to DynamoDB
        ts = int(time.time())  # current UNIX timestamp (seconds)

        # Store the user's message
        await table.put_item(Item={
            "user_id": composite_id,
            "timestamp": ts,
            "data": json.dumps({
                "role": "user",
                "content": user_query
            })
        })

        # Store the assistant's reply (use ts+1 to avoid colliding sort keys)
        await table.put_item(Item={
            "user_id": composite_id,
            "timestamp": ts + 1,
            "data": json.dumps({
                "role": "assistant",
                "content": assistant_response
            })
        })

        # 5) Return only the assistant's response string
        return assistant_response

class FormulaSheet(BaseModel):
    text: str = Field(description="The contents of the formula sheet")

formula_stuff_chain = create_stuff_documents_chain(
    llm=llm.with_structured_output(FormulaSheet, method="function_calling"),
    prompt=formula_prompt,
    output_parser=NoOpOutputParser()
)

async def generate_formula_sheet(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    nim_retriever = await get_nim_retriever(composite_id)

    formula_chain = create_retrieval_chain(
        retriever=nim_retriever,
        combine_docs_chain=formula_stuff_chain
    )

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

async def generate_study_guide(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    nim_retriever = await get_nim_retriever(composite_id)

    study_chain = create_retrieval_chain(
        retriever=nim_retriever,
        combine_docs_chain=study_stuff_chain
    )

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

async def generate_quiz(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    nim_retriever = await get_nim_retriever(composite_id)

    quiz_chain = create_retrieval_chain(
        retriever=nim_retriever,
        combine_docs_chain=quiz_stuff_chain
    )

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

async def generate_flashcards(user_id, course_id, user_query, topic_names):

    composite_id = str(user_id) + str(course_id)

    nim_retriever = await get_nim_retriever(composite_id)

    flash_chain = create_retrieval_chain(
        retriever=nim_retriever,
        combine_docs_chain=flash_stuff_chain
    )

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