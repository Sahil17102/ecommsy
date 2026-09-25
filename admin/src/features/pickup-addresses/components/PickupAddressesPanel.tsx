import { Spin, Tag, Empty } from "antd";
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Undo2,
} from "lucide-react";
import { useAdminPickupAddresses } from "../queries";
import { formatKeyword } from "@/lib/utils";
import type { PickupAddress } from "../types";

interface PickupAddressesPanelProps {
  userId: string;
}

function AddressBlock({ address }: { address: PickupAddress["rtoAddress"] & { pincode: string } }) {
  return (
    <p className="text-xs text-muted leading-relaxed">
      {address.addressLine1}
      {address.addressLine2 && `, ${address.addressLine2}`}
      {address.landmark && ` (${address.landmark})`}
      <br />
      {address.city}, {address.state} — {address.pincode}
    </p>
  );
}

export function PickupAddressesPanel({ userId }: PickupAddressesPanelProps) {
  const { data: addresses, isLoading } = useAdminPickupAddresses(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin />
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="py-12">
        <Empty description="No pickup addresses added by this user" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      {addresses.map((addr) => (
        <div
          key={addr.id}
          className={`bg-background-elevated border rounded-xl p-4 sm:p-5 ${
            addr.isActive
              ? "border-border-light"
              : "border-border-light opacity-60"
          }`}
        >
          {/* Header: nickname + tags */}
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {addr.nickname}
            </span>
            {addr.isPrimary && (
              <Tag
                bordered={false}
                color="blue"
                className="!text-[10px]"
                icon={<Star size={10} className="inline mr-0.5" />}
              >
                Primary
              </Tag>
            )}
            <Tag bordered={false} className="!text-[10px] uppercase !px-1.5">
              {addr.addressType}
            </Tag>
            {!addr.isActive && (
              <Tag bordered={false} color="default" className="!text-[10px]">
                Inactive
              </Tag>
            )}
          </div>

          {/* Contact + address details */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5">
              <p className="text-xs text-foreground font-medium">
                {addr.contactName}
                <span className="text-muted font-normal ml-1.5">
                  ({formatKeyword(addr.role)})
                </span>
              </p>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Phone size={11} /> {addr.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={11} /> {addr.email}
                </span>
              </div>
            </div>

            <AddressBlock address={addr} />

            {addr.gstNumber && (
              <p className="text-xs text-muted">
                <span className="font-medium text-foreground">GST:</span>{" "}
                <code className="px-1 py-0.5 rounded bg-surface-muted text-[11px] font-mono">
                  {addr.gstNumber}
                </code>
              </p>
            )}
          </div>

          {/* RTO Address (if different) */}
          {!addr.isSameAsRto && addr.rtoAddress && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Undo2 size={12} className="text-violet-500" />
                <span className="text-xs font-semibold text-foreground">
                  RTO Address
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-foreground font-medium">
                  {addr.rtoAddress.contactName}
                  <span className="text-muted font-normal ml-1.5">
                    ({formatKeyword(addr.rtoAddress.role)})
                  </span>
                </p>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Phone size={11} /> {addr.rtoAddress.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail size={11} /> {addr.rtoAddress.email}
                  </span>
                </div>
                <AddressBlock address={addr.rtoAddress as PickupAddress["rtoAddress"] & { pincode: string }} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
