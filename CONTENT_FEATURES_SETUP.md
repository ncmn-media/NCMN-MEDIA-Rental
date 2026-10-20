# 공지사항·자료실 기능 적용 안내

## 추가된 기능
- `/notices`: 공개 게시된 공지 목록
- `/notices/[id]`: 공지 상세 페이지
- `/media`: 공개 게시된 노션 페이지·노션 데이터베이스·유튜브 링크 카드
- `/admin/content`: 관리자 전용 공지/자료 등록·수정·삭제 화면
- 기존 `/admin` 대시보드 상단의 `공지·자료 관리` 링크
- API: `/api/notices`, `/api/notices/[id]`, `/api/media`, `/api/admin/content`, `/api/admin/content/[id]`

## Firestore 컬렉션
- `notices`: `title`, `content`, `published`, `createdAtIso`, `updatedAt`, `updatedAtIso`
- `mediaLinks`: `title`, `description`, `url`, `type`, `published`, `createdAtIso`, `updatedAt`, `updatedAtIso`
- `type`: `notion-page`, `notion-database`, `youtube`

공개 API는 `published == true` 문서만 반환합니다. 쓰기/관리자 목록 API는 기존 `verifyAdminRequest()`로 Firebase ID 토큰 및 `ADMIN_UIDS`를 확인합니다. Admin SDK는 Firestore 보안 규칙을 우회하므로, 일반 사용자는 이 관리자 API를 통해 쓰기 작업을 할 수 없습니다.

## 배포 전 확인
1. Vercel 환경변수에 기존 Firebase Admin 설정(`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `ADMIN_UIDS`)이 있는지 확인합니다.
2. 관리자 계정 UID가 `ADMIN_UIDS`에 포함되어 있는지 확인합니다.
3. 프로젝트 루트에서 `npm ci`, `npm run build`를 실행해 확인한 뒤 GitHub에 반영하고 Vercel에 배포합니다.
4. `/admin/content`에서 테스트 공지/자료를 등록하고 공개/비공개 상태를 확인합니다.
5. 기존 예약 신청 및 재고 관리 API/페이지는 수정하지 않았습니다. `/admin/page.tsx`는 대시보드 링크만 추가했습니다.

## 참고
일부 공개 YouTube 영상은 링크를 가진 사람은 볼 수 있으므로 민감한 내부 정보에는 사용하지 마세요. 링크 접근 권한은 Notion/YouTube 쪽 공유 설정을 따릅니다.


## 공지 이미지 업로드 및 링크 버튼
- 관리자 공지 작성/수정에서 이미지 파일(이미지 형식, 최대 10MB)을 업로드할 수 있습니다.
- 업로드는 진행률 표시를 지원하는 `uploadBytesResumable()`을 사용합니다. 업로드 이미지는 Firebase Cloud Storage의 `notice-images/<관리자 UID>/` 경로에 저장되고, 다운로드 URL이 공지 문서의 `imageUrl` 필드에 저장됩니다.
- 공지에 `linkUrl` 및 `linkText`를 입력하면 공지 상세 페이지에 외부 링크 버튼이 표시됩니다. URL은 http/https만 허용됩니다.
- 이미지 업로드를 사용하려면 Firebase Console에서 Cloud Storage를 설정하고 Storage 보안 규칙을 관리자 UID에 맞게 적용해야 합니다. 아래 예시의 `ADMIN_UID_HERE`를 Firebase Authentication의 실제 관리자 UID로 바꿔 적용하세요. 이 규칙은 지정한 관리자 UID만 업로드/삭제할 수 있고, 공개 사용자는 이미지 읽기만 허용합니다.

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /notice-images/{adminUid}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == adminUid
                   && request.auth.uid == 'ADMIN_UID_HERE'
                   && request.resource != null
                   && request.resource.size <= 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

> 위 예시는 이미지 업로드/교체를 위한 최소 규칙입니다. 기존 Storage 규칙이 있다면 통째로 덮어쓰기 전에 다른 경로에서 사용 중인 권한을 확인하세요. Firebase Cloud Storage의 요금제/버킷 설정이 필요할 수 있습니다.
