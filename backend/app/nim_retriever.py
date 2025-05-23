import asyncio
import io
import json
from typing import Any, Iterable, List

import aiohttp
from langchain.schema import Document
from langchain.vectorstores.base import VectorStore

class AiohttpRAGVectorStore(VectorStore):
    """
    A VectorStore wrapper around NVIDIA RAG retriever (/v1/search)
    and ingestion (/v1/documents) servers, using aiohttp for all calls.
    All “fancier” methods simply fall back to the basic /search call.
    """

    def __init__(
        self,
        retriever_url: str,
        ingestion_url: str,
        api_key: str,
        collection_name: str = "multimodal_data",
    ):
        # ensure no trailing slash, point at /v1
        self.retriever_url = retriever_url.rstrip("/") + "/v1"
        self.ingestion_url = ingestion_url.rstrip("/") + "/v1"
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.collection_name = collection_name

    # ─── Ingestion ────────────────────────────────────────────────────────────────

    def add_texts(
        self,
        texts: Iterable[str],
        **kwargs: Any,
    ) -> List[str]:
        # synchronous wrapper around the async version
        return asyncio.get_event_loop().run_until_complete(
            self.aadd_texts(texts, **kwargs)
        )

    async def aadd_texts(
        self,
        texts: Iterable[str],
        **kwargs: Any,
    ) -> List[str]:
        """
        Calls POST /v1/documents with multipart/form-data:
          - `documents`: each text as a .txt file
          - `data`: JSON string with { collection_name }
        Returns a list containing the ingestion task_id.
        """
        form = aiohttp.FormData()
        for idx, txt in enumerate(texts):
            form.add_field(
                "documents",
                io.BytesIO(txt.encode("utf-8")),
                filename=f"doc_{idx}.txt",
                content_type="text/plain",
            )

        # minimal metadata per spec
        meta = {"collection_name": self.collection_name}
        form.add_field("data", json.dumps(meta))

        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.post(
                f"{self.ingestion_url}/documents", data=form
            ) as resp:
                resp.raise_for_status()
                result = await resp.json()
                # spec: { message: str, task_id: str }
                return [result["task_id"]]

    # ─── Similarity Search ────────────────────────────────────────────────────────

    def similarity_search(
        self, query: str, k: int = 4, **kwargs: Any
    ) -> List[Document]:
        # sync wrapper
        return asyncio.get_event_loop().run_until_complete(
            self.asimilarity_search(query, k, **kwargs)
        )

    async def asimilarity_search(
        self, query: str, k: int = 4, **kwargs: Any
    ) -> List[Document]:
        """
        Calls POST /v1/search with JSON { query }.
        Parses out the `results` array of SourceResult objects.
        """
        payload = {"query": query}
        async with aiohttp.ClientSession(
            headers={**self.headers, "Content-Type": "application/json"}
        ) as session:
            async with session.post(
                f"{self.retriever_url}/search", json=payload
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                results = data.get("results", [])
                docs: List[Document] = []
                for hit in results:
                    docs.append(
                        Document(
                            page_content=hit["content"],
                            metadata={
                                "document_id": hit.get("document_id"),
                                "score": hit.get("score"),
                                **hit.get("metadata", {}),
                            },
                        )
                    )
                return docs

    # ─── “Fancier” methods simply reuse the basic search ────────────────────────

    def similarity_search_by_vector(
        self, embedding: List[float], k: int = 4, **kwargs: Any
    ) -> List[Document]:
        return self.similarity_search(query="", k=k)

    def max_marginal_relevance_search(
        self, query: str, k: int = 4, fetch_k: int = 20, **kwargs: Any
    ) -> List[Document]:
        return self.similarity_search(query, k)

    def max_marginal_relevance_search_by_vector(
        self, embedding: List[float], k: int = 4, fetch_k: int = 20, **kwargs: Any
    ) -> List[Document]:
        return self.similarity_search(query="", k=k)
