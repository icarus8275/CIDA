import { Suspense } from "react";
import { CourseCodeExplorer } from "@/components/course-code-explorer";
import { getExploreData } from "@/lib/explore-data";
import { ExploreLoading } from "./explore-loading";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const data = await getExploreData();
  return (
    <Suspense fallback={<ExploreLoading />}>
      <CourseCodeExplorer initialData={data} />
    </Suspense>
  );
}
