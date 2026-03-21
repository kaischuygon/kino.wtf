import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';

export default function GuessBox({
  options,
  state,
  setState,
  disabled = false,
}: {
  options: string[];
  state: string;
  setState: React.Dispatch<React.SetStateAction<string>>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const shouldAutoFocus = useMemo(
    () => (typeof window !== 'undefined' ? window.innerWidth >= 640 : false),
    [],
  );

  const fuse = useMemo(
    () => new Fuse(options, { ignoreDiacritics: true, threshold: 0.2 }),
    [options],
  );

  const filteredOptions = useMemo(
    () => (query === '' ? options : fuse.search(query).map((s) => s.item)),
    [fuse, options, query],
  );

  return (
    <Combobox
      value={state}
      virtual={{ options: filteredOptions.length > 0 ? filteredOptions : [query] }}
      onChange={(value) => setState(value ?? '')}
      onClose={() => setQuery('')}
    >
      <ComboboxInput
        type="search"
        className="input join-item w-full"
        aria-label="Guess"
        displayValue={(option: string | null) => option ?? ''}
        onChange={(event) => {
          event.preventDefault();
          setQuery(event?.target.value);
        }}
        placeholder="Enter a guess..."
        disabled={disabled}
        autoFocus={shouldAutoFocus}
      />
      <ComboboxOptions
        anchor="bottom"
        className="bg-base-200 rounded-field shadow p-1 flex flex-col w-(--input-width) max-h-30! border border-base-300 empty:invisible"
      >
        {({ option: option }) => (
          <ComboboxOption
            value={option}
            className="btn btn-ghost btn-sm h-fit text-left font-normal w-full justify-start p-1 data-focus:btn-active! z-0"
          >
            {option}
          </ComboboxOption>
        )}
      </ComboboxOptions>
    </Combobox>
  );
}
