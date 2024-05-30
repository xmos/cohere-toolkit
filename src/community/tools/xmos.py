import os

from langserve import RemoteRunnable

from community.tools import BaseTool



class XmosRetriever(BaseTool):
    def __init__(self):
        self.retriever = RemoteRunnable(os.environ["XMOS_RETRIEVER_URL"])

    @classmethod
    def is_available(cls) -> bool:
        return "XMOS_RETRIEVER_URL" in os.environ

    def call(self, parameters: dict, **kwargs: ...) -> list[dict[str, ...]]:
        docs = self.retriever.invoke(parameters["query"])
        return [
            {
                "text": doc.metadata["Header Path"] + "\n" +doc.page_content,
                "url": doc.metadata["url"],
                "title": doc.metadata["title"],
            }
            for doc in docs
        ]
