import { MapPin, Plus } from "lucide-react";
import type { PickupAddress } from "../types";
import { AddressCard } from "./AddressCard";

interface AddressListProps {
  addresses: PickupAddress[];
  onAdd: () => void;
  onEdit: (address: PickupAddress) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-background-elevated rounded-2xl border border-border-light p-8 sm:p-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <MapPin className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1.5">
        No Pickup Addresses Yet
      </h3>
      <p className="text-sm text-muted max-w-sm mb-5">
        Add your first pickup address to get started. Your first address will
        automatically be set as the primary address.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/25 transition-shadow"
      >
        <Plus className="w-4 h-4" />
        Add Your First Address
      </button>
    </div>
  );
}

export function AddressList({
  addresses,
  onAdd,
  onEdit,
  onDelete,
  onSetPrimary,
}: AddressListProps) {
  if (addresses.length === 0) {
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {addresses.map((address, i) => (
        <AddressCard
          key={address.id}
          address={address}
          index={i}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetPrimary={onSetPrimary}
        />
      ))}
    </div>
  );
}
