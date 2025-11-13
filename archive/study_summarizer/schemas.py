from pydantic import BaseModel


class PlatformStudy(BaseModel):
    id: str
    name: str
    url: str
    type: str

class Study(BaseModel):
    id: str
    name: str
    summary: str
    author: str
    published_at: str
    labels: list[str]
    
class StudyQuality(BaseModel):
    study_id: str
    group: str (mice, humans, etc.)
    size: int
    time_in_days: int
    has_reference_group: bool

