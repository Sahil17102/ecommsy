import { Typography } from "antd";
import { Construction } from "lucide-react";

const { Title, Text } = Typography;

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-xl bg-primary-bg flex items-center justify-center mb-5">
        <Construction size={32} className="text-primary" />
      </div>
      <Title level={3} className="!text-foreground !mb-2">
        {title}
      </Title>
      <Text className="text-muted text-base">
        This section is under development and will be available soon.
      </Text>
    </div>
  );
}
