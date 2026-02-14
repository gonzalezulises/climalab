import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function CampaignNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Campana no encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            La campana que buscas no existe o fue eliminada.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/campaigns">Volver a campanas</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
