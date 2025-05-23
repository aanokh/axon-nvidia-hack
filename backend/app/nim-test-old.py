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
import asyncio
import aiohttp

HEADERS = {"Authorization": f"Bearer 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"}

# VLM‐based OCR (NeMo Retriever Parse)
PARSE_URL="https://integrate.api.nvidia.com/v1/chat/completions"
# (model name: nvidia/nemoretriever-parse) :contentReference[oaicite:0]{index=0}

# Page Elements detection
PAGEEL_URL="https://ai.api.nvidia.com/v1/cv/nvidia/nemoretriever-page-elements-v2"
# POST to ${PAGEEL_URL}/v1/infer with {"input":[...]} :contentReference[oaicite:1]{index=1}

# Graphic Elements detection
GRAPHIC_URL="https://ai.api.nvidia.com/v1/cv/nvidia/nemoretriever-graphic-elements-v1"
# POST to ${GRAPHIC_URL}/v1/infer with {"input":[...]} :contentReference[oaicite:2]{index=2}

# Table Structure extraction
TABLE_URL="https://ai.api.nvidia.com/v1/cv/nvidia/nemoretriever-table-structure-v1"
# POST to ${TABLE_URL}/v1/infer with {"input":[...]} :contentReference[oaicite:3]{index=3}

# Text Embeddings (NeMo Retriever Embed)
EMBED_URL="https://integrate.api.nvidia.com/v1/retrieval/nvidia/llama-3.2-nv-embedqa-1b-v2/infer"
# POST to ${EMBED_URL} with {"input": [...], "input_type":"query" or "passage"} :contentReference[oaicite:4]{index=4}

async def nim_parse_asset(asset_id: str) -> list[dict]:
    nvai_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization":          f"Bearer {os.getenv('NIM_API_KEY')}",
        "Content-Type":           "application/json",
        "Accept":                 "application/json",
        "NVCF-INPUT-ASSET-REFERENCES": asset_id,
        "NVCF-FUNCTION-ASSET-IDS":      asset_id,
    }

    # pick the bounding-box tool
    tools = [{
        "type":     "function",
        "function": {"name": "markdown_bbox"},
    }]

    # embed your asset as a single image_url message
    messages = [{
        "role":    "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;asset_id,{asset_id}"}
            }
        ]
    }]

    payload = {
        "model":    "nvidia/nemoretriever-parse",
        "tools":    tools,
        "messages": messages
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(nvai_url, headers=headers, json=payload) as resp:
            resp.raise_for_status()
            data = await resp.json()

    # extract the function call arguments (a JSON list)
    tool_call = data["choices"][0]["message"]["tool_calls"][0]
    parsed_args = json.loads(tool_call["function"]["arguments"])
    return parsed_args[0]  # this is the list of {bbox, text, type} dicts


async def ingest_with_nim_via_langchain(user_id: str, course_id: str, filename: str):
    s3_uri = f"s3://axon-main/upload/{user_id}/{course_id}/{filename}"
    docs: list[Document] = []

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        # 1) Parse PDF → text_blocks + page_images



        """
        async with session.post("https://integrate.api.nvidia.com/v1/chat/completions", json={"uri": s3_uri}) as resp:
            resp.raise_for_status()
            parsed = await resp.json()
            """

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


# ─── CONFIG ────────────────────────────────────────────────────────────────
API_KEY = "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"
PARSE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# ─── STEP 1: UPLOAD ASSET ───────────────────────────────────────────────────
async def upload_asset(session: aiohttp.ClientSession, image_bytes: bytes, description: str) -> str:
    """Upload raw image bytes → returns NVIDIA asset_id."""
    # a) ask for a presigned upload URL
    resp = await session.post(
        "https://api.nvcf.nvidia.com/v2/nvcf/assets",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        json={"contentType": "image/jpeg", "description": description},
    )
    resp.raise_for_status()
    info = await resp.json()
    upload_url = info["uploadUrl"]
    asset_id = info["assetId"]

    # b) PUT the bytes into that URL
    put = await session.put(
        upload_url,
        data=image_bytes,
        headers={
            "x-amz-meta-nvcf-asset-description": description,
            "content-type": "image/jpeg",
        },
    )
    put.raise_for_status()
    return asset_id

# ─── STEP 2: PARSE ASSET ────────────────────────────────────────────────────
async def parse_asset(session: aiohttp.ClientSession, asset_id: str) -> list[dict]:
    """Call nemoretriever-parse via chat/completions → returns list of regions."""
    headers = {
        "Authorization":                f"Bearer {API_KEY}",
        "Content-Type":                 "application/json",
        "Accept":                       "application/json",
        "NVCF-INPUT-ASSET-REFERENCES":  asset_id,
        "NVCF-FUNCTION-ASSET-IDS":      asset_id,
    }

    # we only need the markdown_bbox tool
    tools = [{
        "type":     "function",
        "function": {"name": "markdown_bbox"},
    }]

    # and a single image_url message
    messages = [{
        "role": "user",
        "content": [{
            "type":      "image_url",
            "image_url": {"url": f"data:image/jpeg;asset_id,{asset_id}"}
        }]
    }]

    payload = {
        "model":    "nvidia/nemoretriever-parse",
        "tools":    tools,
        "messages": messages
    }

    resp = await session.post(PARSE_URL, headers=headers, json=payload)
    resp.raise_for_status()
    data = await resp.json()

    # extract the tool call arguments
    tool_call    = data["choices"][0]["message"]["tool_calls"][0]
    parsed_args  = json.loads(tool_call["function"]["arguments"])
    return parsed_args[0]   # list of {bbox, text, type}

# ─── STEP 3: INTEGRATE WITH S3 ──────────────────────────────────────────────
async def parse_s3_page(bucket: str, key: str) -> list[dict]:
    """
    Downloads an image from S3, uploads to NVCF, parses via NIM,
    and returns the list of detected regions.
    """
    # a) download bytes from S3
    session = aiohttp.ClientSession()
    s3 = aioboto3.Session().client("s3")
    async with s3 as s3client:
        obj = await s3client.get_object(Bucket=bucket, Key=key)
        image_bytes = await obj["Body"].read()

    # b) upload & parse
    try:
        asset_id = await upload_asset(session, image_bytes, description=key)
        regions  = await parse_asset(session, asset_id)
    finally:
        await session.close()

    return regions

# ─── EXAMPLE USAGE ─────────────────────────────────────────────────────────
async def main():
    bucket = "my-bucket"
    key    = "pages/page1.png"  # for example, from your earlier PDF split
    regions = await parse_s3_page(bucket, key)
    print(json.dumps(regions, indent=2))

if __name__ == "__main__":
    asyncio.run(main())