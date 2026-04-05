export function formatMessageTime(date){
    if(!date) return ""; // Fallback for missing dates
    const d = new Date(date);
    if(isNaN(d.getTime())) return ""; // Fallback for invalid dates
    return d.toLocaleTimeString("en-US",{
        hour: "2-digit",
        minute:"2-digit",
        hour12: true
    })
}

export function formatLastSeen(date) {
    if (!date) return "last seen recently";

    const seenDate = new Date(date);
    if (isNaN(seenDate.getTime())) return "last seen recently";

    const now = new Date();
    const isToday = now.toDateString() === seenDate.toDateString();
    const time = seenDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).toLowerCase();

    if (isToday) {
        return `last seen today at ${time}`;
    }

    const shortDate = seenDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
    });

    return `last seen ${shortDate} at ${time}`;
}

export function formatPhoneNumber(phone) {
    if (!phone) return "Not shared yet";

    const cleaned = phone.toString().replace(/[^\d+]/g, "");
    const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;

    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }

    if (digits.length === 12 && digits.startsWith("91")) {
        return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }

    return cleaned;
}
