"use client";

import { useState, useEffect, useRef } from "react";
import { searchMessages, searchMessagesGlobal } from "../../messaging/api";
import { Message, Room } from "../../../shared/types";

export type SearchScope = "room" | "all";

export function useSearch(activeRoom: Room | null) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [scope, setScope] = useState<SearchScope>("room");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [activeRoom]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || (scope === "room" && !activeRoom)) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      const req = scope === "all"
        ? searchMessagesGlobal(trimmed)
        : searchMessages(activeRoom!.name, trimmed);
      req.then(setSearchResults).finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, activeRoom, scope]);

  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return {
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
    searchResults,
    searching,
    scope, setScope,
    searchInputRef,
    openSearch,
    closeSearch,
  };
}
