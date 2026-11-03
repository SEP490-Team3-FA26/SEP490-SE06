"""Verify production image selection without Docker or production access."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


BUILD_SCRIPT = Path(__file__).resolve().parents[1] / "build-prod-images.sh"
BACKEND = "wdp301-backend:latest"
FRONTEND = "wdp301-frontend:latest"
AI = "wdp301-ai:latest"
ALL_IMAGES = [BACKEND, FRONTEND, AI]


class ImageSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "scripts").mkdir()
        shutil.copyfile(BUILD_SCRIPT, self.root / "scripts/build-prod-images.sh")
        self.state = self.root / "docker-state.json"
        self.state.write_text(json.dumps({"images": {}, "builds": []}))
        bindir = self.root / "bin"
        bindir.mkdir()
        docker = bindir / "docker"
        docker.write_text("""#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
p = Path(os.environ['MOCK_DOCKER_STATE'])
state = json.loads(p.read_text())
args = sys.argv[1:]
if args[:2] == ['image', 'inspect']:
    label = state['images'].get(args[-1])
    if label is None:
        sys.exit(1)
    print(label)
elif args[0] == 'build':
    image = args[args.index('-t') + 1]
    if image == os.environ.get('FAIL_IMAGE'):
        sys.exit(42)
    state['builds'].append(image)
    state['images'][image] = args[args.index('--label') + 1].split('=', 1)[1]
    p.write_text(json.dumps(state))
else:
    sys.exit(99)
""")
        docker.chmod(0o755)
        self.env = {
            **os.environ,
            "PATH": f"{bindir}:{os.environ['PATH']}",
            "MOCK_DOCKER_STATE": str(self.state),
            "FORCE_REBUILD": "0",
            "FAIL_IMAGE": "",
        }
        self.git("init", "-q")
        self.git("config", "user.name", "Deploy test")
        self.git("config", "user.email", "deploy-test@example.invalid")
        for file in ["backend/app.ts", "frontend/app.tsx", "package.json",
                     "backend/apps/ai-service/requirements.txt",
                     "backend/docker/frontend.Dockerfile",
                     "backend/docker/nginx.frontend.conf", ".dockerignore"]:
            self.change(file)
        self.commit()

    def git(self, *args):
        return subprocess.check_output(
            ["git", *args], cwd=self.root, text=True, stderr=subprocess.DEVNULL
        ).strip()

    def change(self, path):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        with file.open("a") as stream:
            stream.write("changed\n")

    def commit(self):
        self.git("add", ".")
        self.git("commit", "-qm", "Test input change")

    def run_build(self, **env):
        return subprocess.run(
            ["bash", "scripts/build-prod-images.sh"], cwd=self.root,
            env={**self.env, **env}, capture_output=True, text=True,
        )

    def seed_images(self, label=None):
        revision = label if label is not None else self.git("rev-parse", "HEAD")
        self.state.write_text(json.dumps({
            "images": dict.fromkeys(ALL_IMAGES, revision), "builds": [],
        }))

    def assert_builds(self, expected, **env):
        result = self.run_build(**env)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(self.state.read_text())["builds"], expected)

    def test_missing_images_build_all_and_record_revision(self):
        self.assert_builds(ALL_IMAGES)
        state = json.loads(self.state.read_text())
        self.assertEqual(set(state["images"].values()), {self.git("rev-parse", "HEAD")})

    def test_unchanged_images_are_reused(self):
        self.seed_images()
        self.assert_builds([])

    def test_changes_select_only_affected_contexts(self):
        for path, expected in [
            ("frontend/app.tsx", [FRONTEND]),
            ("backend/app.ts", [BACKEND]),
            ("backend/apps/ai-service/requirements.txt", [BACKEND, AI]),
            ("package.json", [FRONTEND]),
            ("backend/docker/nginx.frontend.conf", [BACKEND, FRONTEND]),
            (".dockerignore", [FRONTEND]),
        ]:
            with self.subTest(path=path):
                self.seed_images()
                self.change(path)
                self.commit()
                self.assert_builds(expected)

    def test_deleted_input_rebuilds_image(self):
        self.seed_images()
        (self.root / "frontend/app.tsx").unlink()
        self.commit()
        self.assert_builds([FRONTEND])

    def test_missing_or_unknown_revision_rebuilds_safely(self):
        for label in ["", "unknown-commit"]:
            with self.subTest(label=label):
                self.seed_images(label)
                self.assert_builds(ALL_IMAGES)

    def test_force_rebuild(self):
        self.seed_images()
        self.assert_builds(ALL_IMAGES, FORCE_REBUILD="1")

    def test_each_image_retains_its_own_revision_across_releases(self):
        self.seed_images()
        original = self.git("rev-parse", "HEAD")
        self.change("frontend/app.tsx")
        self.commit()
        self.assert_builds([FRONTEND])
        state = json.loads(self.state.read_text())
        self.assertEqual(state["images"][AI], original)
        state["builds"] = []
        self.state.write_text(json.dumps(state))
        self.change("backend/app.ts")
        self.commit()
        self.assert_builds([BACKEND])

    def test_failure_stops_remaining_builds(self):
        result = self.run_build(FAIL_IMAGE=BACKEND)
        self.assertEqual(result.returncode, 42)
        self.assertEqual(json.loads(self.state.read_text())["builds"], [])


if __name__ == "__main__":
    unittest.main()
