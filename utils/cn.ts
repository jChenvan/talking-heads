export default function cn(...args:(string|false)[]) {
    const strings = args.map(arg => arg || "");
    return strings.join(" ");
}