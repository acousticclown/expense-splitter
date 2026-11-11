import { GroupWorkspace } from "@/components/GroupWorkspace";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GroupWorkspace slug={slug} />;
}
