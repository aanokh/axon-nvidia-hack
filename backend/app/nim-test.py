import os
import asyncio
import aiohttp
from aws import boto
from langchain.schema import Document
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
import json
from botocore.config import Config

# ─── ENVIRONMENT / ENDPOINTS ───────────────────────────────────────────────
API_KEY      = os.getenv("NIM_API_KEY")
PARSE_URL    = "https://integrate.api.nvidia.com/v1/models/nvidia/nemoretriever-parse/infer/v1"
PAGEEL_URL   = "https://integrate.api.nvidia.com/v1/models/nvidia/nemoretriever-page-elements-v2/infer/v1"
GRAPHIC_URL  = "https://integrate.api.nvidia.com/v1/models/nvidia/nemoretriever-graphic-elements-v1/infer/v1"
TABLE_URL    = "https://integrate.api.nvidia.com/v1/models/nvidia/nemoretriever-table-structure-v1/infer/v1"
EMBED_URL    = "https://integrate.api.nvidia.com/v1/retrieval/nvidia/llama-3.2-nv-embedqa-1b-v2/infer/v1"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type":  "application/json"
}

# ─── LANGCHAIN + QDRANT SETUP ───────────────────────────────────────────────
embeddings = NVIDIAEmbeddings(
    model="nvidia/llama-3.2-nv-embedqa-1b-v2", 
    api_key="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", 
    truncate="NONE", 
)

qdrant_client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_API_KEY"))
qdrant_vs = QdrantVectorStore(
    client=qdrant_client,
    collection_name="nemo",
    embedding=embeddings
)

# ─── INGESTION FUNCTION ────────────────────────────────────────────────────
async def ingest_pdf(user_id: str, course_id: str, filename: str):
    s3_uri = f"s3://axon-main/upload/{user_id}/{course_id}/{filename}"
    docs: list[Document] = []

    

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        # 1) Parse PDF → text_blocks + page_images
        # 2) generate presigned GET URL
        #cfg = Config(signature_version="s3v4", region_name="us-west-2")
        async with boto.client("s3") as s3:
            download_url = await s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": "axon-main", "Key": f"upload/{user_id}/{course_id}/{filename}"},
                ExpiresIn=1200
            )

        # 1) Build the chat-completions payload per the nemoretriever-parse docs
        parse_payload = {
            "model": "nvidia/nemoretriever-parse",
            "messages": [
                {
                    "role": "user",
                    # wrap your PDF URL in an <img> tag so the VLM knows to fetch & rasterize it
                    "content": f'<img src="{download_url}" />'
                }
            ],
            "max_tokens": 512
        }

        # 2) Call the NVIDIA-integrate chat completions endpoint
        async with session.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={
                "Authorization": "Bearer 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",
                "Content-Type":  "application/json",
                "Accept":        "application/json",
            },
            json=parse_payload
        ) as resp:
            text = await resp.text()
            print("API error body:", text)
            resp.raise_for_status()
            parse_response = await resp.json()

        # 3) Pull out the function-calling arguments
        tool_call = parse_response["choices"][0]["message"]["tool_calls"][0]
        parsed = json.loads(tool_call["function"]["arguments"])[0]
        print(parsed)







        # convert text blocks to Documents
        for blk in result.get("text_blocks", []):
            docs.append(Document(
                page_content=blk["text"],
                metadata={
                    "user_id":    user_id,
                    "course_id":  course_id,
                    "page":       blk["page"],
                    "type":       "text_block",
                }
            ))

        # 2) For each generated page image, detect regions
        for img in result.get("page_images", []):
            async with session.post(
                PAGEEL_URL, json={"image_uri": img["uri"]}
            ) as pe:
                pe.raise_for_status()
                regions = (await pe.json())["regions"]

            # 3) Extract graphic/table snippets
            for reg in regions:
                if reg["type"] == "graphic":
                    url = GRAPHIC_URL;       key = "texts"
                elif reg["type"] == "table":
                    url = TABLE_URL;         key = "data"
                else:
                    continue

                async with session.post(
                    url, json={"image_uri": img["uri"], "bbox": reg["bbox"]}
                ) as ex:
                    ex.raise_for_status()
                    out = await ex.json()

                if reg["type"] == "graphic":
                    for t in out.get("texts", []):
                        docs.append(Document(
                            page_content=t["text"],
                            metadata={
                                "user_id":    user_id,
                                "course_id":  course_id,
                                "page":       img["page"],
                                "type":       "graphic",
                                **t
                            }
                        ))
                else:  # table rows
                    headers = out.get("headers", [])
                    for row in out.get("data", []):
                        docs.append(Document(
                            page_content="\t".join(row),
                            metadata={
                                "user_id":    user_id,
                                "course_id":  course_id,
                                "page":       img["page"],
                                "type":       "table",
                                "headers":    headers
                            }
                        ))

    # 4) Bulk‐add into Qdrant via LangChain
    await qdrant_vs.aadd_documents(docs)

# ─── EXAMPLE USAGE ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    asyncio.run(ingest_pdf(123, 123, "syllabus.pdf"))
