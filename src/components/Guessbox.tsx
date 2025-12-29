import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { useState } from "react";

export default function GuessBox({options, state, setState, disabled=false}:{options:string[], state:string, setState: React.Dispatch<React.SetStateAction<string>>, disabled?:boolean}) {
    const [query, setQuery] = useState("");

    const filteredOptions =
        query === ''
            ? options
            : options.filter((g) => g.toLowerCase().includes(query.toLowerCase()));

    return (
        <Combobox 
            value={state} 
            virtual={{ options: filteredOptions.length > 0 ? filteredOptions : [query] }} 
            onChange={(value) => setState(value?.replace(/[^a-zA-Z\s]/g, '') ?? "")} 
            onClose={() => setQuery('')}
        >
            <ComboboxInput
                type="search"
                className="input join-item w-full"
                aria-label="Guess"
                displayValue={(option: string | null) => option ?? ""}
                onChange={(event) => {event.preventDefault(); setQuery(event?.target.value)}}
                placeholder="Enter a guess..."
                disabled={disabled}
                autoFocus
            />
            <ComboboxOptions anchor="bottom" className="bg-base-200 rounded-field shadow p-1 flex flex-col w-(--input-width) max-h-30! border border-base-300 empty:invisible">
                {({ option: option }) => (
                    <ComboboxOption value={option} className="btn btn-ghost btn-sm font-normal w-full justify-start p-1 data-focus:btn-active! z-0">
                        {option}
                    </ComboboxOption>
                )}
            </ComboboxOptions>
        </Combobox>
    )
}
