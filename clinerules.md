DO NOT output JSON blocks like {"name": "write_to_file"}. You MUST strictly use Anthropic-style XML tags to invoke tools.

Tool format example:
<write_to_file>
<path>test.txt</path>
<content>Hello world</content>
</write_to_file>