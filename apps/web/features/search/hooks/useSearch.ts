"use client";

import { useState, useEffect, useRef } from "react";
import { searchMessages } from "../../messaging/api";
import { Message, Room } from "../../../shared/types";

export function useSearch(activeRoom: Room | null) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [activeRoom]);

  useEffect(() => {
    if (!searchQuery.trim() || !activeRoom) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      searchMessages(activeRoom.name, searchQuery.trim())
        .then(setSearchResults)
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, activeRoom]);

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
    searchInputRef,
    openSearch,
    closeSearch,
  };
}
