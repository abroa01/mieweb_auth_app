import { ApprovalTokens } from "./api/approvalTokens";

export const formatDateTime = (isoString) => {
    if (!isoString) return "";
  
    const date = new Date(isoString);
    
    // Extracting date in YYYY-MM-DD format
    const formattedDate = date.toISOString().split("T")[0];
  
    // Extracting time in HH:MM format
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  
    return `${formattedDate} ${formattedTime}`;
  };

  export const isValidToken = async(userId, token) => {
    // Look up the token
    const tokenRecord = await ApprovalTokens.findOneAsync({
      userId,
      token,
      expiresAt: { $gt: new Date() },
      used: false
    });

    return tokenRecord;
  }