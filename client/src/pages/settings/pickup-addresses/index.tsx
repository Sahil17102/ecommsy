import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Loader2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  usePickupAddresses,
  useCreatePickupAddress,
  useUpdatePickupAddress,
  useDeletePickupAddress,
  useSetPrimaryAddress,
} from "./queries";
import type { PickupAddress, PickupAddressFormValues } from "./types";
import { AddressList } from "./components/AddressList";
import { AddressFormDrawer } from "./components/AddressFormDrawer";
import { BulkImportModal } from "./components/BulkImportModal";

export default function PickupAddressesPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<PickupAddress | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: addresses = [], isLoading } = usePickupAddresses();
  const createMutation = useCreatePickupAddress();
  const updateMutation = useUpdatePickupAddress();
  const deleteMutation = useDeletePickupAddress();
  const setPrimaryMutation = useSetPrimaryAddress();

  const openDrawer = useCallback((address?: PickupAddress) => {
    setEditingAddress(address ?? null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingAddress(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: PickupAddressFormValues) => {
      try {
        if (editingAddress) {
          await updateMutation.mutateAsync({ id: editingAddress.id, data });
          toast.success("Address updated successfully");
        } else {
          await createMutation.mutateAsync(data);
          toast.success("Address added successfully");
        }
        closeDrawer();
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again.";
        toast.error(message);
      }
    },
    [editingAddress, createMutation, updateMutation, closeDrawer],
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      toast.success("Address deleted successfully");
      setDeleteConfirmId(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete address";
      toast.error(message);
    }
  }, [deleteConfirmId, deleteMutation]);

  const handleSetPrimary = useCallback(
    async (id: string) => {
      try {
        await setPrimaryMutation.mutateAsync(id);
        toast.success("Primary address updated");
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to set primary address";
        toast.error(message);
      }
    },
    [setPrimaryMutation],
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary/[0.06] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Manage Pickup Addresses
            </h1>
            <p className="text-xs text-muted">
              Add and manage your pickup and RTO locations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-primary border border-primary/30 hover:bg-primary/[0.06] transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import in Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => openDrawer()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/25 transition-shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Address</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <AddressList
          addresses={addresses}
          onAdd={() => openDrawer()}
          onEdit={openDrawer}
          onDelete={handleDelete}
          onSetPrimary={handleSetPrimary}
        />
      )}

      {/* Delete confirmation bar */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50"
          >
            <span className="text-sm">
              Delete{" "}
              <span className="font-semibold">
                {addresses.find((a) => a.id === deleteConfirmId)?.nickname ??
                  "this address"}
              </span>
              ?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-background/60 hover:text-background disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address Form Drawer */}
      <AddressFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        editingAddress={editingAddress}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal isOpen={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
