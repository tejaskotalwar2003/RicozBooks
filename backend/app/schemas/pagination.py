from typing import Generic, TypeVar, List, Optional, Any
from pydantic import BaseModel
from math import ceil

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        from_attributes = True

def get_pagination_params(
    page: int = 1,
    page_size: int = 20,
    max_page_size: int = 100
):
    """
    Validates and returns normalized (page, page_size, offset).
    """
    safe_page = max(1, page)
    safe_page_size = max(1, min(page_size, max_page_size))
    offset = (safe_page - 1) * safe_page_size
    return safe_page, safe_page_size, offset

def paginate_query(
    query,
    page: int = 1,
    page_size: int = 20,
    max_page_size: int = 100
):
    """
    Applies offset and limit to an existing SQLAlchemy query and computes total records.
    Returns (items, total, page, page_size, total_pages).
    """
    safe_page, safe_page_size, offset = get_pagination_params(page, page_size, max_page_size)
    total = query.order_by(None).count()
    total_pages = ceil(total / safe_page_size) if total > 0 else 1
    items = query.offset(offset).limit(safe_page_size).all()
    return items, total, safe_page, safe_page_size, total_pages

def build_paginated_response(
    items: List[Any],
    total: int,
    page: int,
    page_size: int
) -> dict:
    """
    Constructs a dictionary matching the PaginatedResponse schema.
    """
    safe_page_size = max(1, page_size)
    total_pages = ceil(total / safe_page_size) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": safe_page_size,
        "total_pages": total_pages
    }

def paginate_or_all(
    query,
    page: int = 1,
    page_size: int = 20,
    paginate: bool = True,
    max_page_size: int = 100,
    item_transform = None
):
    """
    If paginate is True, executes query with pagination and returns a PaginatedResponse dict.
    If paginate is False, executes query.all() and returns a flat list (for backward-compat & dropdown pickers).
    """
    if not paginate:
        raw_items = query.all()
        if item_transform:
            return [item_transform(it) for it in raw_items]
        return raw_items

    safe_page, safe_page_size, offset = get_pagination_params(page, page_size, max_page_size)
    total = query.order_by(None).count()
    raw_items = query.offset(offset).limit(safe_page_size).all()
    if item_transform:
        items = [item_transform(it) for it in raw_items]
    else:
        items = raw_items
    return build_paginated_response(items, total, safe_page, safe_page_size)

