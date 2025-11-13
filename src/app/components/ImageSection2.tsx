"use client";

import React from "react";

export interface MissionImage {
  image_url: string;
  image_slot_name: string; // "kamera_atas" | "kamera_bawah"
}

interface ImageSectionProps {
  missionImages: MissionImage[];
}

// BASE URL ke Flask di NUC, diambil dari .env
// contoh di .env.local: NEXT_PUBLIC_MJPEG_BASE=http://192.168.1.10:5000
const MJPEG_BASE = process.env.NEXT_PUBLIC_MJPEG_BASE || "";

// Komponen untuk 1 kotak (atas / bawah)
function SlotBox(props: {
  title: string;
  slotName: "kamera_atas" | "kamera_bawah";
  images: MissionImage[];
}) {
  const { title, slotName, images } = props;
  const hasImages = images.length > 0;

  // URL stream dari Flask (lokal)
  const streamSrc =
    slotName === "kamera_atas"
      ? `${MJPEG_BASE}/video_feed/atas`
      : `${MJPEG_BASE}/video_feed/bawah`;

  return (
    <div className="imageSlot">
      <h3>{title}</h3>

      <div className="imageGallery">
        {hasImages ? (
          // Kalau sudah ada foto di Supabase → tampilkan foto-fotonya
          images.map((img, index) => (
            <img key={index} src={img.image_url} alt={title} />
          ))
        ) : (
          // Kalau belum ada foto → tampilkan LIVE stream dari kamera (Flask)
          <div className="liveWrapper">
            <span className="liveBadge">LIVE</span>
            <img
              src={streamSrc}
              alt={`${title} (Live)`}
              className="liveImage"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const ImageSection: React.FC<ImageSectionProps> = ({ missionImages }) => {
  // Filter gambar per slot
  const atas = missionImages.filter(
    (img) => img.image_slot_name === "kamera_atas"
  );
  const bawah = missionImages.filter(
    (img) => img.image_slot_name === "kamera_bawah"
  );

  return (
    <section className="imagesSection">
      <h2>Gambar Misi</h2>
      <div className="imagesContainer">
        <SlotBox title="Kamera Atas" slotName="kamera_atas" images={atas} />
        <SlotBox title="Kamera Bawah" slotName="kamera_bawah" images={bawah} />
      </div>
    </section>
  );
};

export default ImageSection;
