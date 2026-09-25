import { Card, Typography } from "antd";
import { ReactNode } from "react";

const { Title, Text } = Typography;

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className = "" }: FeatureCardProps) {
  return (
    <Card className={`h-full ${className}`} bordered>
      <div className="flex flex-col">
        <div className="w-12 h-12 rounded-lg bg-primary-bg flex items-center justify-center mb-4 text-primary text-xl">
          {icon}
        </div>
        <Title level={5} className="!mb-2">
          {title}
        </Title>
        <Text type="secondary" className="text-sm">
          {description}
        </Text>
      </div>
    </Card>
  );
}
