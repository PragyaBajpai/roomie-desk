import Link from "next/link";
import { EnquiryForm } from "@/components/enquiry-form";
import { PageHeader } from "@/components/ui";
import { createEnquiryAction } from "@/app/actions";

export default function NewEnquiryPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/enquiries" className="text-[12.5px] text-ink-500 hover:text-ink-950">← Enquiries</Link>
      <div className="mt-2" />
      <PageHeader title="New enquiry" subtitle="Capture what they need — matching starts as soon as you save." />
      <EnquiryForm action={createEnquiryAction} submitLabel="Create enquiry" />
    </div>
  );
}
