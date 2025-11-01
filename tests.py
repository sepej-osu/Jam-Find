import unittest

class TestCase(unittest.TestCase):

    def test1(self):
        expected = "Hello World"
        self.assertEqual(expected, expected)

if __name__ == '__main__':
    unittest.main()
