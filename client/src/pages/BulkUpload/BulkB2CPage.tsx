import { BulkUploadWizard } from "./index";
import { b2cBulkConfig } from "./configs/b2c";

export default function BulkB2CPage() {
  return <BulkUploadWizard config={b2cBulkConfig} />;
}
