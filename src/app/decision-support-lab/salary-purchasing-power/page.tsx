import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import SalaryPurchasingPowerHero from "@/components/salaryPurchasingPower/SalaryPurchasingPowerHero";
import SalaryPurchasingPowerCalculator from "@/components/salaryPurchasingPower/SalaryPurchasingPowerCalculator";
import { getCpiMonthlyIndexSeries } from "@/lib/data/cpiMonthlyIndex";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/salary-purchasing-power`;
const TITLE = "Salary Purchasing Power Calculator — Is Your Salary Keeping Up? | PEIC Decision Support Lab";
const DESCRIPTION = "Check whether your salary has kept pace with inflation since your last raise, using PBS's official National CPI index.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function SalaryPurchasingPowerPage() {
  const series = await getCpiMonthlyIndexSeries();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="salary-purchasing-power" />

          <SalaryPurchasingPowerHero />

          <SalaryPurchasingPowerCalculator series={series} />
        </div>
      </main>
    </div>
  );
}
