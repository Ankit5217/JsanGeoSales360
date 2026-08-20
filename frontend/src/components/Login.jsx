import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import jsanLogo from "../assets/jsan-logo.jpg";

export default function Login() {

    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {

        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await login(username, password);
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setSubmitting(false);
        }

    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f5f7fa"
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    width: "320px",
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "32px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "8px"
                    }}
                >
                    <img
                        src={jsanLogo}
                        alt="JSAN logo"
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "8px",
                            objectFit: "cover"
                        }}
                    />
                    <div
                        style={{
                            fontSize: "18px",
                            fontWeight: "bold",
                            color: "#0B2E4F"
                        }}
                    >
                        GeoSales 360
                    </div>
                </div>

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px"
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px"
                    }}
                />

                {error && (
                    <div
                        style={{
                            color: "#C1443C",
                            fontSize: "13px"
                        }}
                    >
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#0B2E4F",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "14px",
                        cursor: submitting ? "default" : "pointer",
                        opacity: submitting ? 0.7 : 1
                    }}
                >
                    {submitting ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </div>
    );

}
