import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { APP_TITLE } from "@/const";

export default function ResetPassword() {
  const navigate = (path: string) => { window.location.href = path; };
  const [location] = useLocation();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  useEffect(() => {
    // Extract token from URL query params
    const params = new URLSearchParams(location.split("?")[1] || "");
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast.error("Token di reset mancante");
      navigate("/");
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token di reset non valido");
      return;
    }

    if (password.length < 8) {
      toast.error("La password deve essere di almeno 8 caratteri");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        newPassword: password,
      });

      setResetSuccess(true);
      toast.success("Password reimpostata con successo!");

      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || "Errore durante il reset della password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Password Reimpostata!</CardTitle>
            <CardDescription>
              La tua password è stata reimpostata con successo. Verrai reindirizzato alla home page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{APP_TITLE} - Reset Password</CardTitle>
          <CardDescription>
            Inserisci la tua nuova password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuova Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Almeno 8 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ripeti la password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reimpostazione...
                </>
              ) : (
                "Reimposta Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
