import { Block, LoadingScreen, PageHeaderSkeleton } from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <LoadingScreen>
      <PageHeaderSkeleton back={{ href: "/admin", label: "Users" }} />
      <Block className="h-[calc(100dvh-14rem)] min-h-[28rem] rounded-2xl" />
    </LoadingScreen>
  );
}
