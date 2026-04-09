export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  size?: string;
}

export async function listDriveImages(
  accessToken: string,
  folderId?: string
): Promise<DriveFile[]> {
  const query = folderId
    ? `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`
    : `mimeType contains 'image/' and trashed = false`;

  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,size)",
    pageSize: "50",
    orderBy: "modifiedTime desc",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error: ${err}`);
  }

  const data = await res.json();
  return (data.files ?? []) as DriveFile[];
}

export async function getDriveFileContent(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Drive download error: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) throw new Error(`Drive folder creation error: ${res.status}`);
  return res.json();
}

export async function uploadImageToDrive(
  accessToken: string,
  name: string,
  mimeType: string,
  content: Buffer,
  folderId?: string
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name, mimeType };
  if (folderId) metadata.parents = [folderId];

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", new Blob([content], { type: mimeType }));

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webContentLink,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!res.ok) throw new Error(`Drive upload error: ${res.status}`);
  return res.json();
}
