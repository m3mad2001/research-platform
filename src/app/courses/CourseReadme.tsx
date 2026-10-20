import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

/* eslint-disable @next/next/no-img-element -- README images have arbitrary HTTPS hosts and unknown dimensions. */

function githubBase(url: string): { owner: string; repo: string; branch: string; path: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || (parts.length > 2 && parts[2] !== "tree")) return null;
    if (parts.length > 2 && parts.length < 4) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, ""), branch: parts[3] ?? "main", path: parts.slice(4).join("/") };
  } catch { return null; }
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");
}

function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return plainText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function resolveUrl(value: string, source: string | null | undefined, image: boolean): string {
  if (value.startsWith("#")) {
    if (image) return "";
    try { return `#readme-${slug(decodeURIComponent(value.slice(1)))}`; }
    catch { return ""; }
  }
  try {
    const absolute = new URL(value);
    return absolute.protocol === "https:" ? absolute.toString() : "";
  } catch { /* A local path needs a GitHub repository as its base. */ }

  const repo = githubBase(source ?? "");
  if (!repo || value.startsWith("/") || value.startsWith("//")) return "";
  try {
    const base = new URL(`https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${repo.path ? `${repo.path}/` : ""}`);
    const relative = new URL(value, base);
    const root = `/${repo.owner}/${repo.repo}/blob/${repo.branch}/`;
    if (relative.origin !== base.origin || !relative.pathname.startsWith(root)) return "";
    const suffix = relative.pathname.slice(root.length);
    return image
      ? `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${suffix}`
      : relative.toString();
  } catch { return ""; }
}

export default function CourseReadme({ markdown, repositoryUrl }: {
  markdown: string;
  repositoryUrl?: string | null;
}) {
  const heading = (tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
    function Heading({ children }: { children?: ReactNode }) {
      const Tag = tag;
      return <Tag id={`readme-${slug(plainText(children))}`}>{children}</Tag>;
    };

  return <div className="course-readme min-w-0 break-words">
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}
      urlTransform={(url, key) => resolveUrl(url, repositoryUrl, key === "src")}
      components={{
        h1: heading("h1"), h2: heading("h2"), h3: heading("h3"),
        h4: heading("h4"), h5: heading("h5"), h6: heading("h6"),
        a: ({ href, children }) => href
          ? <a href={href} target={href.startsWith("#") ? undefined : "_blank"}
              rel={href.startsWith("#") ? undefined : "noopener noreferrer"}>{children}</a>
          : <span>{children}</span>,
        img: ({ src, alt, title }) => src
          ? <img src={src} alt={alt ?? ""} title={title} loading="lazy" />
          : <span>{alt ?? "Image unavailable"}</span>,
        td: ({ children, colSpan, rowSpan, width }) =>
          <td colSpan={colSpan} rowSpan={rowSpan} width={width}>{children}</td>,
      }}>
      {markdown}
    </Markdown>
  </div>;
}
