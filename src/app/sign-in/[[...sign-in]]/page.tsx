import { SignIn } from "@clerk/nextjs";

const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  padding: "1rem",
  backgroundColor: "var(--color-background)",
};

export default function Page() {
  return (
    <div style={containerStyle}
     aria-label="User sign in page">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
