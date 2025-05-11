import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";

interface ProfileSection {
  title: string;
  link: string;
  value?: string;
}

interface MerchantProfileSectionsProps {
  username: string | null | undefined;
}

export function MerchantProfileSections({ username }: MerchantProfileSectionsProps) {
  const params = useParams();
  const merchantId = params.id as string;
  const displayName = username || "Shop";
  
  const sections: ProfileSection[] = [
    { title: "Shop Name", link: `/merchant/${merchantId}/shop-name`, value: displayName },
    { title: "Security", link: `/merchant/${merchantId}/security` },
    { title: "Transactions", link: `/merchant/${merchantId}/transactions` },
    { title: "Recovery", link: `/merchant/${merchantId}/recovery` }
  ];

  return (
    <div className="mt-8 w-full">
      {sections.map((section, index) => (
        <Link href={section.link} key={section.title}>
          <div className={`py-4 px-2 flex justify-between items-center ${index !== 0 ? "border-t border-gray-800" : ""}`}>
            <span className="text-white text-base">{section.title}</span>
            <div className="flex items-center">
              {section.value && (
                <span className="text-gray-400 mr-2">{section.value}</span>
              )}
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 