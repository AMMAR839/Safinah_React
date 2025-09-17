import React from 'react';

interface MissionImage {
    image_url: string;
    image_slot_name: string;
}

interface ImageSectionProps {
    missionImages: MissionImage[];
}

const ImageSection: React.FC<ImageSectionProps> = ({ missionImages }) => {
    return (
        <section className="imagesSection">
            <h2>Gambar Misi</h2>
            <div className="imagesContainer">
                <div className="imageSlot">
                    <h3>Kamera Atas</h3>
                    <div id="kamera-depan-container" className="imageGallery">
                        {missionImages.filter(img => img.image_slot_name === 'kamera_atas').map((img, index) => (
                            <img key={index} src={img.image_url} alt="Kamera Atas" />
                        ))}
                        {missionImages.filter(img => img.image_slot_name === 'kamera_atas').length === 0 && <p>Belum ada foto.</p>}
                    </div>
                </div>
                <div className="imageSlot">
                    <h3>Kamera Bawah</h3>
                    <div id="kamera-belakang-container" className="imageGallery">
                        {missionImages.filter(img => img.image_slot_name === 'kamera_bawah').map((img, index) => (
                            <img key={index} src={img.image_url} alt="Kamera Bawah" />
                        ))}
                        {missionImages.filter(img => img.image_slot_name === 'kamera_bawah').length === 0 && <p>Belum ada foto.</p>}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ImageSection;