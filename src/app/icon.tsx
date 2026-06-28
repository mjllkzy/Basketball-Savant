import { ImageResponse } from "next/og";
import { ShotClockMark } from "@/components/brand/ShotClockMark";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <ShotClockMark idPrefix="shotclock-app-icon" style={{ width: "100%", height: "100%" }} />
    ),
    size,
  );
}
