import { BulkUploadWizard } from "./index";
import { b2bBulkConfig } from "./configs/b2b";

export default function BulkB2BPage() {
  return <BulkUploadWizard config={b2bBulkConfig} />;
}
