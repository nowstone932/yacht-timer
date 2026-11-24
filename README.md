# TACK · 요트 경기 타이머

요트 출발 카운트다운을 음성으로 알려주고, 경기 부저(경적)를 마이크로 감지해 자동으로 시간을 맞추는 웹앱입니다.

- 사용: GitHub Pages 주소를 휴대폰 브라우저로 열기 (마이크는 https에서만 동작)
- 로컬: `index.html`을 브라우저로 열기, 설치·빌드 없음
- 테스트: `node test-core.cjs`, `node test-detector.cjs`, `node test-dom.cjs`, `node test-browser-mic.cjs`(Playwright 필요)

자세한 내용은 `START-HERE.txt`를 보세요. 공식 기준은 시각 신호이며, 실전 전 공식 신호와 비교해 확인하세요.
