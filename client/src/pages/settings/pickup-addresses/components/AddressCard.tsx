import {
  MapPin,
  Star,
  Pencil,
  Trash2,
  MoreVertical,
  Phone,
  Mail,
  User,
  RotateCcw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { PickupAddress } from "../types";
import { ROLE_OPTIONS } from "../config";

interface AddressCardProps {
  address: PickupAddress;
  index?: number;
  onEdit: (address: PickupAddress) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

export function AddressCard({
  address,
  index = 0,
  onEdit,
  onDelete,
  onSetPrimary,
}: AddressCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const roleLabel =
    ROLE_OPTIONS.find((r) => r.value === address.role)?.label ?? address.role;

  const fullAddress = [
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    `${address.city}, ${address.state} - ${address.pincode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={`relative bg-background-elevated rounded-2xl border hover:shadow-md transition-all group animate-fade-in-up ${
        address.isPrimary
          ? "border-primary/25 shadow-sm shadow-primary/5"
          : "border-border-light hover:border-primary/20"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                address.isPrimary
                  ? "bg-accent/10"
                  : "bg-primary/10"
              }`}
            >
              <MapPin
                className={`w-5 h-5 ${
                  address.isPrimary ? "text-accent" : "text-primary"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground truncate">
                  {address.nickname}
                </h4>
                {address.isPrimary && (
                  <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                    <Star className="w-2.5 h-2.5 fill-accent" />
                    Primary
                  </span>
                )}
              </div>
              <p className="text-[11px] text-tertiary mt-0.5">Pickup Address</p>
            </div>
          </div>

          {/* Actions menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-background-elevated rounded-xl border border-border-light shadow-lg z-10 py-1 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(address);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-foreground hover:bg-primary/[0.06] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted" />
                  Edit Address
                </button>
                {!address.isPrimary && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSetPrimary(address.id);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-foreground hover:bg-primary/[0.06] transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-muted" />
                    Set as Primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(address.id);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-2">
          {fullAddress}
        </p>

        {/* Contact info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <User className="w-3.5 h-3.5 text-tertiary shrink-0" />
            <span className="truncate">
              {address.contactName}
              <span className="text-tertiary ml-1">({roleLabel})</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-muted">
              <Phone className="w-3.5 h-3.5 text-tertiary shrink-0" />
              {address.phone}
            </span>
            {address.email && (
              <span className="flex items-center gap-2 text-xs text-muted truncate">
                <Mail className="w-3.5 h-3.5 text-tertiary shrink-0" />
                <span className="truncate">{address.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* RTO Address Details */}
        {!address.isSameAsRto && address.rtoAddress && (
          <div className="mt-4 p-3 rounded-xl bg-background border border-border-light">
            <div className="flex items-center gap-1.5 mb-2">
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary">
                RTO Address
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-2">
              {[
                address.rtoAddress.addressLine1,
                address.rtoAddress.addressLine2,
                address.rtoAddress.landmark,
                `${address.rtoAddress.city}, ${address.rtoAddress.state} - ${address.rtoAddress.pincode}`,
                address.rtoAddress.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-tertiary" />
                {address.rtoAddress.contactName}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-tertiary" />
                {address.rtoAddress.phone}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
