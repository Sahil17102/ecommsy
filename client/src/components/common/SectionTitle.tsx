import { Typography } from "antd";
import { typography } from "@/config";

const { Title, Text } = Typography;

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export function SectionTitle({ title, subtitle, centered = false }: SectionTitleProps) {
  return (
    <div className={centered ? "text-center mb-section-gap" : "mb-section-gap"}>
      <Title level={2} className="!mb-2">
        {title}
      </Title>
      {subtitle && (
        <Text
          type="secondary"
          className={centered ? `block ${typography.bodyMaxWidth} mx-auto` : "block"}
        >
          {subtitle}
        </Text>
      )}
    </div>
  );
}
