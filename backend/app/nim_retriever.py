import asyncio
import io
import json
from typing import Any, Iterable, List, Optional, Type, TypeVar, Dict

import aiohttp
from langchain.schema import Document
from langchain.embeddings.base import Embeddings
from langchain.vectorstores.base import VectorStore
from uuid import uuid4

T = TypeVar("T", bound="AiohttpRAGVectorStore")


class nimRAGVectorStore(VectorStore):
    """
    VectorStore wrapper around NVIDIA RAG:
      • Retriever at POST {retriever_url}/v1/search
      • Ingestion at POST {ingestion_url}/v1/documents
    All “fancier” methods stubbed back to simple search/upsert.
    """

    def __init__(
        self,
        retriever_url: str,
        ingestion_url: str,
        api_key: str,
        collection_name: str
    ):
        # normalize to /v1
        self.retriever_url = retriever_url
        self.ingestion_url = ingestion_url
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.collection_name = collection_name

    # ─── Factories ────────────────────────────────────────────────────────────────

    @classmethod
    def from_texts(
        cls: Type[T],
        texts: List[str],
        embeddings: Embeddings,
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ) -> T:
        """
        Create store, ingest texts, return instance.
        Requires: retriever_url, ingestion_url, api_key in kwargs.
        """
        retriever_url = kwargs.pop("retriever_url")
        ingestion_url = kwargs.pop("ingestion_url")
        api_key = kwargs.pop("api_key")
        store = cls(retriever_url, ingestion_url, api_key)
        # ingest synchronously
        asyncio.get_event_loop().run_until_complete(
            store.aadd_texts(texts, metadatas=metadatas)
        )
        return store

    @classmethod
    async def afrom_texts(
        cls: Type[T],
        texts: List[str],
        embeddings: Embeddings,
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ) -> T:
        """
        Async version of from_texts.
        """
        retriever_url = kwargs.pop("retriever_url")
        ingestion_url = kwargs.pop("ingestion_url")
        api_key = kwargs.pop("api_key")
        store = cls(retriever_url, ingestion_url, api_key)
        await store.aadd_texts(texts, metadatas=metadatas)
        return store

    @classmethod
    def from_documents(
        cls: Type[T],
        documents: List[Document],
        embeddings: Embeddings,
        **kwargs: Any,
    ) -> T:
        """
        Create store, ingest Documents, return instance.
        """
        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        return cls.from_texts(texts, embeddings, metadatas=metadatas, **kwargs)

    @classmethod
    async def afrom_documents(
        cls: Type[T],
        documents: List[Document],
        embeddings: Embeddings,
        **kwargs: Any,
    ) -> T:
        """
        Async version of from_documents.
        """
        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        return await cls.afrom_texts(texts, embeddings, metadatas=metadatas, **kwargs)

    # ─── Ingestion ────────────────────────────────────────────────────────────────

    def add_texts(
        self,
        texts: Iterable[str],
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ) -> List[str]:
        return asyncio.get_event_loop().run_until_complete(
            self.aadd_texts(texts, metadatas=metadatas, **kwargs)
        )

    async def aadd_texts(
        self,
        texts: Iterable[str],
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ) -> List[str]:
        """
        POST /v1/documents multipart:
          - documents: each text as a .txt file
          - data: JSON { collection_name }
        Returns [ task_id ].
        """
        form = aiohttp.FormData()
        for idx, txt in enumerate(texts):
            uid = uuid4().hex
            form.add_field(
                "documents",
                io.BytesIO(txt.encode("utf-8")),
                filename=f"doc_{uid}.txt",
                content_type="text/plain",
            )
        form.add_field("data", json.dumps({"collection_name": self.collection_name}))

        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.post(
                f"{self.ingestion_url}/documents", data=form
            ) as resp:
                resp.raise_for_status()
                result = await resp.json()
                return [result["task_id"]]

    def add_documents(
        self, documents: List[Document], **kwargs: Any
    ) -> List[str]:
        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        return self.add_texts(texts, metadatas=metadatas, **kwargs)

    async def aadd_documents(
        self, documents: List[Document], **kwargs: Any
    ) -> List[str]:
        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        return await self.aadd_texts(texts, metadatas=metadatas, **kwargs)

    # ─── Retrieval ────────────────────────────────────────────────────────────────

    def similarity_search(
        self, query: str, k: int = 4, **kwargs: Any
    ) -> List[Document]:
        return asyncio.get_event_loop().run_until_complete(
            self.asimilarity_search(query, k, **kwargs)
        )

    async def asimilarity_search(
        self, query: str, k: int = 4, **kwargs: Any
    ) -> List[Document]:
        payload = {"query": query, "collection_name": self.collection_name}
        async with aiohttp.ClientSession(
            headers={**self.headers, "Content-Type": "application/json"}
        ) as session:
            async with session.post(
                f"{self.retriever_url}/search", json=payload
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                docs: List[Document] = []
                for hit in data.get("results", []):
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

    def similarity_search_by_vector(
        self, embedding: List[float], k: int = 4, **kwargs: Any
    ) -> List[Document]:
        # stub: ignore embedding
        return self.similarity_search(query="", k=k)

    def max_marginal_relevance_search(
        self, query: str, k: int = 4, fetch_k: int = 20, **kwargs: Any
    ) -> List[Document]:
        return self.similarity_search(query, k)

    def max_marginal_relevance_search_by_vector(
        self, embedding: List[float], k: int = 4, fetch_k: int = 20, **kwargs: Any
    ) -> List[Document]:
        return self.similarity_search(query="", k=k)

    # ─── Optional CRUD stubs ────────────────────────────────────────────────────

    def get_by_ids(self, ids: List[str]) -> List[Document]:
        return []

    async def aget_by_ids(self, ids: List[str]) -> List[Document]:
        return []

    def delete(self, ids: Optional[List[str]] = None, **kwargs: Any) -> bool:
        return True

    async def adelete(self, ids: Optional[List[str]] = None, **kwargs: Any) -> bool:
        return True
