import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import { Button } from "@/components/ui/button";

const ranks = [
  "PTE",
  "LCP",
  "CPL",
  "CFC",
  "SCT",
  "3SG",
  "2SG",
  "1SG",
  "SSG",
  "MSG",
  "3WO",
  "2WO",
  "1WO",
  "MWO",
  "SWO",
  "CWO",
  "OCT",
  "2LT",
  "LTA",
  "CPT",
  "MID",
  "MAJ",
  "LTC",
  "SLTC",
  "COL",
  "BG",
  "MG",
  "LG",
  "ME1(T)",
  "ME1",
  "ME2",
  "ME3",
  "ME4T",
  "ME4A",
  "ME4",
  "ME5",
  "ME6",
  "ME7",
  "ME8",
  "ME9",
  "OTHERS"
];

interface RankComboboxProps {
    onRankSelect: (rank: string) => void;
    selectedRank: string | null;
  }
  
  function RankCombobox({ onRankSelect, selectedRank }: RankComboboxProps) {
    const [open, setOpen] = useState(false);
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedRank
              ? ranks.find((rank) => rank === selectedRank)
              : "Select rank..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search rank..." />
            <CommandList>
              <CommandEmpty>No rank found.</CommandEmpty>
              <CommandGroup>
                {ranks.map((rank) => (
                  <CommandItem
                    key={rank}
                    value={rank}
                    onSelect={(value) => {
                      onRankSelect(value === selectedRank ? "" : value);
                      setOpen(false);
                    }}
                  >
                    {rank}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
  
  export default RankCombobox;