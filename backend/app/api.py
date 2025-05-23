from fastapi import FastAPI, Request
import os
from aws import boto
from ai_core import *
from boto3.dynamodb.conditions import Key
import simplejson
import time
import json

app = FastAPI()

@app.get("/")
async def read_root():
    print("Hello")
    return {"hello": "world"}

'''
{
    user_id: ""
    course_id: ""
}
'''
@app.post("/generate-learning-plan")
async def generate_learning_plan_handler(request: Request):
    request_data = await request.json()

    await generate_learning_plan(user_id=request_data["user_id"], course_id=request_data["course_id"])

    return {"status": "success", "user_id": request_data["user_id"]}

@app.post("/get-learning-plan")
async def get_learning_plan_handler(request: Request):
    request_data = await request.json()

    composite_id = str(request_data["user_id"] + request_data["course_id"])

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        #dynamo_response = await table.get_item(Key=user_id)

        print(f"Querying: {composite_id}")
        dynamo_response = await table.query(
            KeyConditionExpression=Key("user_id").eq(composite_id),
            ScanIndexForward=False,
            Limit=1,
        )
        dynamo_items = dynamo_response.get("Items", [])

        print(f"GOT LEARNING PLAN FOR {composite_id}:::")
        print(dynamo_items)
        
        if dynamo_items:
            lp_curr = json.loads(dynamo_items[0]["data"])
            return {"status": "success", "learning_plan": lp_curr}
        else:
            return {"status": "failure", "learning_plan": None}

@app.post("/get-chat-history")
async def get_chat_history_handler(request: Request):
    request_data = await request.json()

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

@app.post("/save-learning-plan")
async def save_learning_plan_handler(request: Request):
    request_data = await request.json()

    composite_id = str(request_data["user_id"]) + str(request_data["course_id"])

    async with boto.resource("dynamodb") as dynamodb:
        table = await dynamodb.Table('learning-plans')
        
        dynamo_item = {
            "user_id": composite_id,
            "timestamp": int(time.time()),
            "data": json.dumps(request_data['learning_plan'])
        }

        print(f"COMPOSITE KEY FOR SAVING::: {composite_id}")
        print("Saving:: ")
        print(dynamo_item)
        
        await table.put_item(Item=dynamo_item)
    
    return {"status": "success"}

'''
{
    user_id: ""
    course_id: ""
    topic_names: ["", "", ""]
    user_query: ""
}
'''
@app.post("/generate-flashcards")
async def generate_flashcards_handler(request: Request):
    request_data = await request.json()

    result = await generate_flashcards(user_id=request_data["user_id"], course_id=request_data["course_id"], user_query=request_data["user_query"], topic_names=request_data["topic_names"])

    return {"status": "success", "result": result}

@app.post("/generate-formulasheet")
async def generate_formula_sheet_handler(request: Request):
    request_data = await request.json()

    result = await generate_formula_sheet(user_id=request_data["user_id"], course_id=request_data["course_id"], user_query=request_data["user_query"], topic_names=request_data["topic_names"])

    return {"status": "success", "result": result}

@app.post("/generate-studyguide")
async def generate_study_guide_handler(request: Request):
    request_data = await request.json()

    result = await generate_study_guide(user_id=request_data["user_id"], course_id=request_data["course_id"], user_query=request_data["user_query"], topic_names=request_data["topic_names"])

    return {"status": "success", "result": result}

@app.post("/generate-quiz")
async def generate_quiz_handler(request: Request):
    request_data = await request.json()

    result = await generate_quiz(user_id=request_data["user_id"], course_id=request_data["course_id"], user_query=request_data["user_query"], topic_names=request_data["topic_names"])

    return {"status": "success", "result": result}

@app.post("/generate-upload-url")
async def generate_upload_url_handler(request: Request):
    request_data = await request.json()

    user_id = request_data["user_id"]
    course_id = request_data["course_id"]

    print(f"COURSE ID !!! {course_id}")

    s3_key = f'upload/{user_id}/{course_id}/'

    async with boto.client("s3") as s3:
        post = await s3.generate_presigned_post(
            Bucket='axon-main',
            Key=s3_key + '${filename}',  # allows any filename in that "folder"
            Conditions=[
                {"bucket": "axon-main"},
                ["starts-with", "$key", s3_key],
            ],
            ExpiresIn=3600
        )

    response = {'url': post['url'], 'fields': post['fields'], 'key_prefix': s3_key}

    return response

@app.post("/process-new-file")
async def process_new_file_handler(request: Request):
    request_data = await request.json()

    filename = request_data["filename"]
    user_id = request_data["user_id"]
    course_id = request_data["course_id"]

    process_new_file(user_id, course_id, filename)

    return {"status": "success"}


@app.post("/process-syllabus")
async def process_syllabus_handler(request: Request):
    request_data = await request.json()

    filename = request_data["filename"]
    user_id = request_data["user_id"]
    course_id = request_data["course_id"]

    await process_syllabus(user_id, course_id, filename)

    return {"status": "success"}


'''
class GetUploadUrlRequest(BaseModel):
    content_type: str

class GetUploadUrlResponse(BaseModel):
    upload_url: str
    file_key: str

@app.get("/get-upload-url", response_model=GetUploadUrlResponse)
async def get_upload_url(request: GetUploadUrlRequest) -> GetUploadUrlResponse:
'''

