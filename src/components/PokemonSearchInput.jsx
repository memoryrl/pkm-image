import { useEffect, useId, useRef, useState } from 'react';
import { searchPokemonSuggestions } from '../utils/pokemonApi';

const DEBOUNCE_MS = 300;

export default function PokemonSearchInput({
  value,
  onChange,
  onSelect,
  disabled = false,
}) {
  const listId = useId();
  const wrapperRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const results = await searchPokemonSuggestions(trimmed);
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value, disabled]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const pickSuggestion = (name) => {
    onChange(name);
    onSelect(name);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="search-input-wrap" ref={wrapperRef}>
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="포켓몬 이름 (예: 피카츄)"
        autoComplete="off"
        enterKeyHint="search"
        disabled={disabled}
      />

      {showList && (
        <ul className="autocomplete-list" id={listId} role="listbox">
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pickSuggestion(name)}
            >
              {highlightMatch(name, value.trim())}
            </li>
          ))}
        </ul>
      )}

      {loadingSuggestions && value.trim() && !disabled && (
        <span className="autocomplete-loading" aria-hidden="true" />
      )}
    </div>
  );
}

function highlightMatch(name, query) {
  if (!query) return name;

  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerName.indexOf(lowerQuery);
  if (index < 0) return name;

  const before = name.slice(0, index);
  const match = name.slice(index, index + query.length);
  const after = name.slice(index + query.length);

  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  );
}
