



import React from "react";
import { AlertTriangleIcon } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false








}: {open: boolean;onClose: () => void;onConfirm: () => void;title: string;message: React.ReactNode;confirmLabel?: string;destructive?: boolean;}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="max-w-md"
      icon={
      destructive ?
      <div className="w-9 h-9 rounded-lg bg-[rgb(var(--fail-soft))] flex items-center justify-center">
            <AlertTriangleIcon className="w-5 h-5 text-[rgb(var(--fail))]" />
          </div> :
      undefined
      }
      footer={
      <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
          variant={destructive ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}>
          
            {confirmLabel}
          </Button>
        </>
      }>
      
      <div className="px-5 py-4 text-sm text-ink-2 leading-relaxed">{message}</div>
    </Modal>);

}

