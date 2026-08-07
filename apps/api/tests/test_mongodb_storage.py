from pydantic import BaseModel

from app.storage.mongodb import MongoModelDict, MongoValueDict


class SampleRecord(BaseModel):
    id: str
    org_id: str
    job_id: str
    label: str


class FakeCollection:
    def __init__(self) -> None:
        self.documents: dict[str, dict] = {}

    def replace_one(self, query: dict, replacement: dict, *, upsert: bool = False) -> None:
        assert upsert is True
        self.documents[query["_id"]] = replacement

    def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        document = self.documents.get(query["_id"])
        return dict(document) if document else None

    def find(self, query: dict, projection: dict | None = None) -> list[dict]:
        return [
            dict(document)
            for document in self.documents.values()
            if all(document.get(key) == value for key, value in query.items())
        ]

    def delete_one(self, query: dict) -> None:
        self.documents.pop(query["_id"], None)


class FakeDatabase:
    def __init__(self) -> None:
        self.collections: dict[str, FakeCollection] = {}

    def __getitem__(self, name: str) -> FakeCollection:
        return self.collections.setdefault(name, FakeCollection())


def test_mongodb_model_mapping_round_trip_and_org_filter() -> None:
    database = FakeDatabase()
    records = MongoModelDict(database, "samples", SampleRecord)
    first = SampleRecord(id="one", org_id="org-a", job_id="job-a", label="First")
    second = SampleRecord(id="two", org_id="org-b", job_id="job-b", label="Second")

    records[first.id] = first
    records[second.id] = second

    assert records[first.id] == first
    assert records.get("missing") is None
    assert records.values() == [first, second]
    assert records.by_org("org-b") == [second]
    records.delete(first.id)
    assert records.get(first.id) is None


def test_mongodb_value_mapping_supports_pin_counters() -> None:
    database = FakeDatabase()
    values = MongoValueDict(database, "pin_failures", default=0)

    assert values["org:user"] == 0
    values["org:user"] = values["org:user"] + 1
    assert values["org:user"] == 1
