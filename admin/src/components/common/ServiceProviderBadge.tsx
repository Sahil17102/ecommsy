import { Tag } from "antd";
import { getSpVariant } from "@/lib/constants";

interface ServiceProviderBadgeProps {
  /** Service provider slug (e.g. "delhivery") */
  slug: string;
  /** Override the display label (uses slug→label mapping by default) */
  label?: string;
}

/**
 * Consistent color-coded badge for service providers.
 * Uses Ant Design Tag with per-provider color variants.
 */
export default function ServiceProviderBadge({ slug, label }: ServiceProviderBadgeProps) {
  const variant = getSpVariant(slug);

  return (
    <Tag bordered={false} color={variant.color}>
      {variant.label ?? label}
    </Tag>
  );
}
