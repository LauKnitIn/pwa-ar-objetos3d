export async function iniciarCamaraDeFondo(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { 
      facingMode: { ideal: "environment" }, 
      width: { ideal: 1280 }, 
      height: { ideal: 720 } 
    },
    audio: false,
  });
  video.srcObject = stream;
  video.hidden = false;
  await video.play();
  return stream;
}

export function detenerCamaraDeFondo(video: HTMLVideoElement, stream: MediaStream | null): void {
  stream?.getTracks().forEach((pista) => pista.stop());
  video.srcObject = null;
  video.hidden = true;
}