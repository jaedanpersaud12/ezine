import Link from "next/link";
import { StatusScreen } from "@/components/status/StatusScreen";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen title="This page isn't here." message="The link may be old, or the zine may have been deleted.">
      <Link href="/" className={buttonVariants()}>
        Go home
      </Link>
    </StatusScreen>
  );
}
