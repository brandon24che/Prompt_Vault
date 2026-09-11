# PromptVault Security Specification

## 1. Data Invariants
1. **User Identity Invariant**: A user document at `/users/{userId}` can only be initialized or updated if `request.auth.uid == userId` or `isAdmin()`. Normal users cannot elevate their role to `admin`.
2. **Prompts Ownership & Modification**: A prompt can only be created with `authorId == request.auth.uid`. Prompts can only be edited or deleted by the author or an admin.
3. **Likes & Bookmarks Integrity**: A like at `/prompts/{promptId}/likes/{userId}` can only be written or deleted by `request.auth.uid == userId`.
4. **Counter Safeguards**: Only valid increments to `copiesCount` or `likesCount` are allowed when users interact with the prompt.
5. **Admin Access**: Dedicated admin operations (deleting any prompt, viewing all users, modifying roles) require admin status verified via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or the system admin email `cheec702@gmail.com`.

## 2. The "Dirty Dozen" Attack Vectors & Payloads
1. **Self-Escalation Attack**: User sends payload `{ role: "admin" }` to their own profile during signup. -> *Denied by rule forbidding self-assigned admin role unless authorized.*
2. **Prompt Impersonation**: Attacker creates a prompt with `authorId: "victim_uid"`. -> *Denied by `incoming().authorId == request.auth.uid` check.*
3. **Unauthorized Prompt Edit**: Attacker modifies a prompt belonging to another author. -> *Denied by `existing().authorId == request.auth.uid || isAdmin()`.*
4. **Denial of Wallet (Payload Bomb)**: Attacker attempts to post a 5MB prompt text. -> *Denied by `.size() <= 10000` validation.*
5. **Path ID Poisoning**: Attacker sends arbitrary special characters in promptId path. -> *Protected by `isValidId()` regex check.*
6. **Ghost Field Injection**: Attacker injects `{ secretVerifiedToken: true, backdoor: true }` in prompt creation. -> *Blocked by explicit keys size checking.*
7. **Cross-User Like Forgery**: Attacker adds a like under `/prompts/{promptId}/likes/{otherUserUid}`. -> *Denied by `request.auth.uid == userId`.*
8. **Bookmark Snooping**: Attacker attempts to read `/users/{otherUser}/bookmarks`. -> *Denied by ownership match requirement.*
9. **Blanket Query Scraping**: Attacker queries private user fields without authorization. -> *Protected by ABAC query rules.*
10. **Prompt Deletion by Stranger**: Non-author attempts `delete` on `/prompts/{id}`. -> *Denied by authorization check.*
11. **Negative Counters Exploitation**: Attacker sets `copiesCount: -99999`. -> *Denied by non-negative number type constraints.*
12. **Admin Impersonation without Email Verification**: Attacker presents an unverified token claiming admin. -> *Denied by token email_verified and database exists check.*
