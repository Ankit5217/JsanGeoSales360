import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import jsanLogo from "../assets/jsan-logo.jpg";

const inputStyle = {
    padding: "11px 13px",
    borderRadius: "8px",
    border: "1px solid var(--gs-border-strong)",
    fontSize: "14px",
    fontFamily: "inherit",
    background: "var(--gs-surface-2)",
    color: "var(--gs-ink)",
    outline: "none",
    transition: "border-color 0.15s ease, background 0.15s ease"
};

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

    function focusField(e) {
        e.target.style.borderColor = "var(--gs-teal)";
        e.target.style.background = "var(--gs-surface)";
    }

    function blurField(e) {
        e.target.style.borderColor = "var(--gs-border-strong)";
        e.target.style.background = "var(--gs-surface-2)";
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(160deg, var(--gs-navy) 0%, var(--gs-navy-dark) 55%, #051220 100%)",
                padding: "24px",
                boxSizing: "border-box"
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    width: "360px",
                    maxWidth: "100%",
                    background: "var(--gs-surface)",
                    borderRadius: "var(--gs-radius-lg)",
                    padding: "36px 32px",
                    boxShadow: "var(--gs-shadow-lg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "6px"
                    }}
                >
                    <img
                        src={jsanLogo}
                        alt="JSAN logo"
                        style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "10px",
                            objectFit: "cover",
                            boxShadow: "var(--gs-shadow-md)"
                        }}
                    />
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                fontFamily: "var(--gs-font-display)",
                                fontSize: "20px",
                                fontWeight: 800,
                                color: "var(--gs-navy)",
                                letterSpacing: "-0.01em"
                            }}
                        >
                            GeoSales 360
                        </div>
                        <div
                            style={{
                                fontSize: "11px",
                                fontWeight: 500,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "var(--gs-teal)",
                                marginTop: "2px"
                            }}
                        >
                            Field Sales Intelligence
                        </div>
                    </div>
                </div>

                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--gs-ink-muted)", marginBottom: "-8px" }}>
                    Username
                </label>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={focusField}
                    onBlur={blurField}
                    required
                    autoFocus
                    style={inputStyle}
                />

                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--gs-ink-muted)", marginBottom: "-8px" }}>
                    Password
                </label>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={focusField}
                    onBlur={blurField}
                    required
                    style={inputStyle}
                />

                {error && (
                    <div
                        style={{
                            color: "var(--gs-danger)",
                            background: "#FBE9E7",
                            border: "1px solid rgba(193,68,60,0.25)",
                            borderRadius: "6px",
                            padding: "8px 10px",
                            fontSize: "12.5px"
                        }}
                    >
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        background: submitting ? "var(--gs-navy)" : "var(--gs-navy)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "14px",
                        cursor: submitting ? "default" : "pointer",
                        opacity: submitting ? 0.7 : 1,
                        marginTop: "4px",
                        boxShadow: "0 4px 12px rgba(11,46,79,0.25)"
                    }}
                >
                    {submitting ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </div>
    );

}
